import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuditService } from '../audit/audit.service';
import { UnauthorizedError } from '../common/errors';
import {
  Capability,
  capabilitiesForRoles,
} from './capabilities';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
  USER_REPOSITORY,
  UserRepository,
} from './auth.repository';
import {
  AUTH_CONFIG,
  AuthConfig,
  hashRefreshToken,
  newRefreshToken,
} from './auth.config';
import { verifyPassword } from './password';

export interface AccessTokenPayload {
  capabilities: Capability[];
  email: string;
  roles: string[];
  sub: string;
}

export interface TokenPair {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}

export interface AuthenticatedUser {
  capabilities: Capability[];
  email: string;
  id: string;
  roles: string[];
}

export interface LoginResult {
  tokens: TokenPair;
  user: AuthenticatedUser;
}

/**
 * Staff authentication (S01 authorization model; W02 visitor sessions
 * are a separate plane and never reach this service).
 *
 * - Access token: short-lived JWT carrying a capability snapshot
 *   (re-resolved from the DB at refresh time, so role changes
 *   propagate within one access-token lifetime).
 * - Refresh token: opaque, rotating, SHA-256-hashed at rest; rotation
 *   reuses the family id; the absolute session bound (S01 K-2,
 *   default 60 min) never extends.
 * - Lockout: 5 failed attempts → 15 min lock (implementation choice —
 *   the specs require lockout but name no counts; see auth.config.ts).
 * - Error messages never reveal account existence or lockout state:
 *   every login failure is the same generic 401.
 * - MFA is NOT implemented in this phase (deferred per decisions.md):
 *   elevated logins are audited with mfa:'mfa_missing' and no session
 *   counts as MFA-verified.
 */
@Injectable()
export class AuthService {
  private readonly config: AuthConfig;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly tokens: RefreshTokenRepository,
    private readonly audit: AuditService,
    @Inject(AUTH_CONFIG)
    config: AuthConfig,
  ) {
    this.config = config;
  }

  async login(
    email: string,
    password: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      await this.auditLogin(null, [], false, 'unknown_user', meta);
      throw new UnauthorizedError('Invalid credentials.');
    }
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      // Locked: same generic failure — lockout state is never leaked.
      await this.auditLogin(user.id, user.roles, false, 'locked_out', meta);
      throw new UnauthorizedError('Invalid credentials.');
    }
    if (user.lockedUntil && user.lockedUntil <= now) {
      user.lockedUntil = null;
      user.failedAttempts = 0;
    }
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      user.failedAttempts += 1;
      let reason = 'bad_password';
      if (user.failedAttempts >= this.config.lockoutAttempts) {
        user.lockedUntil = new Date(
          now.getTime() + this.config.lockoutMinutes * 60_000,
        );
        reason = 'locked_out';
      }
      await this.users.save(user);
      await this.auditLogin(user.id, user.roles, false, reason, meta);
      throw new UnauthorizedError('Invalid credentials.');
    }
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.users.save(user);

    const tokens = await this.issuePair(user, now);
    const capabilities = capabilitiesForRoles(user.roles);
    await this.auditLogin(user.id, user.roles, true, null, meta);
    return {
      tokens,
      user: {
        capabilities,
        email: user.email,
        id: user.id,
        roles: user.roles,
      },
    };
  }

  async refresh(
    rawToken: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const now = new Date();
    const row = await this.tokens.findByHash(hashRefreshToken(rawToken));
    if (!row) {
      await this.auditLogin(null, [], false, 'unknown_token', meta);
      throw new UnauthorizedError('Invalid credentials.');
    }
    if (row.revokedAt) {
      if (row.revokedReason === 'rotated') {
        // Reuse of an already-rotated token: revoke the whole family.
        await this.tokens.revokeFamily(row.familyId, 'reuse');
        await this.auditLogin(
          row.userId,
          [],
          false,
          'refresh_reuse_detected',
          meta,
        );
      }
      throw new UnauthorizedError('Invalid credentials.');
    }
    if (row.expiresAt <= now || row.absoluteExpiresAt <= now) {
      throw new UnauthorizedError('Invalid credentials.');
    }
    const user = await this.users.findById(row.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials.');
    }
    // Rotate: retire the presented token, issue a new one in the same
    // family, sliding up to — never past — the absolute bound.
    row.revokedAt = now;
    row.revokedReason = 'rotated';
    await this.tokens.save(row);
    const absolute = row.absoluteExpiresAt;
    const sliding = new Date(
      now.getTime() + this.config.sessionTimeoutMinutes * 60_000,
    );
    const next = newRefreshToken();
    await this.tokens.save({
      absoluteExpiresAt: absolute,
      createdAt: now,
      expiresAt: sliding < absolute ? sliding : absolute,
      familyId: row.familyId,
      id: randomUUID(),
      revokedAt: null,
      revokedReason: null,
      tokenHash: next.hash,
      userId: user.id,
    });
    const capabilities = capabilitiesForRoles(user.roles);
    await this.audit.emit({
      action: 'login',
      actorId: user.id,
      actorRoles: user.roles,
      payload: { kind: 'token_refresh', success: true },
      summary: `Token refreshed for ${user.email}.`,
      targetId: user.id,
      targetType: 'staff_user',
    });
    return {
      tokens: {
        accessToken: this.signAccess(user.id, user.email, user.roles),
        expiresInSeconds: this.config.accessTtlMinutes * 60,
        refreshToken: next.raw,
      },
      user: {
        capabilities,
        email: user.email,
        id: user.id,
        roles: user.roles,
      },
    };
  }

  async logout(rawToken: string): Promise<void> {
    const row = await this.tokens.findByHash(hashRefreshToken(rawToken));
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      row.revokedReason = 'logout';
      await this.tokens.save(row);
      await this.audit.emit({
        action: 'logout',
        actorId: row.userId,
        actorRoles: [],
        summary: 'Staff user logged out.',
        targetId: row.userId,
        targetType: 'staff_user',
      });
    }
    // Idempotent: unknown or already-revoked tokens still succeed.
  }

  verifyAccess(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(
        token,
        this.config.jwtSecret,
      ) as AccessTokenPayload;
      if (
        typeof payload.sub !== 'string' ||
        !Array.isArray(payload.roles) ||
        !Array.isArray(payload.capabilities)
      ) {
        throw new Error('Malformed access token payload.');
      }
      return payload;
    } catch {
      throw new UnauthorizedError('Invalid credentials.');
    }
  }

  private signAccess(
    userId: string,
    email: string,
    roles: string[],
  ): string {
    return jwt.sign(
      {
        capabilities: capabilitiesForRoles(roles),
        email,
        roles,
        sub: userId,
      },
      this.config.jwtSecret,
      { expiresIn: `${this.config.accessTtlMinutes}m` },
    );
  }

  private async issuePair(
    user: { email: string; id: string; roles: string[] },
    now: Date,
  ): Promise<TokenPair> {
    const created = newRefreshToken();
    const absolute = new Date(
      now.getTime() + this.config.sessionTimeoutMinutes * 60_000,
    );
    await this.tokens.save({
      absoluteExpiresAt: absolute,
      createdAt: now,
      expiresAt: absolute,
      familyId: randomUUID(),
      id: randomUUID(),
      revokedAt: null,
      revokedReason: null,
      tokenHash: created.hash,
      userId: user.id,
    });
    return {
      accessToken: this.signAccess(user.id, user.email, user.roles),
      expiresInSeconds: this.config.accessTtlMinutes * 60,
      refreshToken: created.raw,
    };
  }

  private async auditLogin(
    userId: string | null,
    roles: string[],
    success: boolean,
    reason: string | null,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const elevated = roles.includes('super_admin') || roles.includes('admin');
    await this.audit.emit({
      action: 'login',
      actorId: userId,
      actorRoles: roles,
      payload: {
        elevated,
        mfa: elevated ? 'mfa_missing' : undefined,
        reason,
        success,
      },
      summary: success
        ? 'Staff user logged in.'
        : 'Failed staff login.',
      targetId: userId,
      targetType: 'staff_user',
    });
  }
}
