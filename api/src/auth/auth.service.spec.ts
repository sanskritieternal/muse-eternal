import { AuditService } from '../audit/audit.service';
import {
  AuditEventInput,
  AuditEventRow,
  AuditRepository,
} from '../audit/audit.repository';
import { UnauthorizedError } from '../common/errors';
import { hashPassword } from './password';
import {
  RefreshTokenRepository,
  RefreshTokenRow,
  StaffUserRow,
  UserRepository,
} from './auth.repository';
import { AuthConfig, hashRefreshToken } from './auth.config';
import { AuthService } from './auth.service';

const TEST_CONFIG: AuthConfig = {
  accessTtlMinutes: 15,
  jwtSecret: 'test-secret-for-specs-only',
  lockoutAttempts: 5,
  lockoutMinutes: 15,
  sessionTimeoutMinutes: 60,
};

function makeAudit(): { events: AuditEventRow[]; service: AuditService } {
  const events: AuditEventRow[] = [];
  const repository: AuditRepository = {
    append: jest.fn().mockImplementation((event: AuditEventInput) => {
      const row: AuditEventRow = {
        ...event,
        createdAt: new Date(),
        id: `evt-${events.length + 1}`,
      };
      events.push(row);
      return Promise.resolve(row);
    }),
    lastHash: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          events.length > 0 ? events[events.length - 1].hash : null,
        ),
      ),
    list: jest.fn().mockResolvedValue([]),
  };
  return { events, service: new AuditService(repository) };
}

function makeUsers(): {
  byEmail: Map<string, StaffUserRow>;
  byId: Map<string, StaffUserRow>;
  repo: UserRepository;
} {
  const byEmail = new Map<string, StaffUserRow>();
  const byId = new Map<string, StaffUserRow>();
  const repo: UserRepository = {
    findByEmail: jest
      .fn()
      .mockImplementation((email: string) =>
        Promise.resolve(byEmail.get(email) ?? null),
      ),
    findById: jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(byId.get(id) ?? null),
      ),
    save: jest.fn().mockImplementation((user: StaffUserRow) => {
      byEmail.set(user.email, user);
      byId.set(user.id, user);
      return Promise.resolve(user);
    }),
  };
  return { byEmail, byId, repo };
}

function makeTokens(): {
  byHash: Map<string, RefreshTokenRow>;
  repo: RefreshTokenRepository;
} {
  const byHash = new Map<string, RefreshTokenRow>();
  const repo: RefreshTokenRepository = {
    findByHash: jest
      .fn()
      .mockImplementation((hash: string) =>
        Promise.resolve(byHash.get(hash) ?? null),
      ),
    revokeFamily: jest.fn().mockImplementation((familyId: string) => {
      for (const token of byHash.values()) {
        if (token.familyId === familyId && !token.revokedAt) {
          token.revokedAt = new Date();
          token.revokedReason = 'reuse';
        }
      }
      return Promise.resolve();
    }),
    save: jest.fn().mockImplementation((token: RefreshTokenRow) => {
      byHash.set(token.tokenHash, token);
      return Promise.resolve(token);
    }),
  };
  return { byHash, repo };
}

async function makeService() {
  const audit = makeAudit();
  const users = makeUsers();
  const tokens = makeTokens();
  const passwordHash = await hashPassword('correct horse');
  const editor: StaffUserRow = {
    createdAt: new Date(),
    email: 'ed@example.test',
    failedAttempts: 0,
    id: 'user-editor',
    lockedUntil: null,
    passwordHash,
    roles: ['editor'],
    updatedAt: new Date(),
  };
  const superAdmin: StaffUserRow = {
    createdAt: new Date(),
    email: 'root@example.test',
    failedAttempts: 0,
    id: 'user-root',
    lockedUntil: null,
    passwordHash,
    roles: ['super_admin'],
    updatedAt: new Date(),
  };
  users.byEmail.set(editor.email, editor);
  users.byId.set(editor.id, editor);
  users.byEmail.set(superAdmin.email, superAdmin);
  users.byId.set(superAdmin.id, superAdmin);
  const service = new AuthService(
    users.repo,
    tokens.repo,
    audit.service,
    TEST_CONFIG,
  );
  return { audit, service, tokens, users };
}

describe('AuthService', () => {
  it('logs in with a capability snapshot and audits elevated logins as mfa_missing', async () => {
    const { audit, service } = await makeService();
    const result = await service.login('root@example.test', 'correct horse');
    expect(result.user.roles).toEqual(['super_admin']);
    expect(result.user.capabilities).toContain('content.publish');
    expect(result.tokens.accessToken.length).toBeGreaterThan(20);
    expect(result.tokens.refreshToken.length).toBeGreaterThan(20);
    const loginEvent = audit.events.find((e) => e.action === 'login');
    expect(loginEvent?.payload).toMatchObject({
      elevated: true,
      mfa: 'mfa_missing',
      success: true,
    });
    // The access token itself carries the snapshot.
    const payload = service.verifyAccess(result.tokens.accessToken);
    expect(payload.sub).toBe('user-root');
    expect(payload.capabilities).toContain('content.publish');
  });

  it('rejects bad passwords with the same generic error as unknown users', async () => {
    const { service } = await makeService();
    await expect(
      service.login('ed@example.test', 'wrong'),
    ).rejects.toThrow(UnauthorizedError);
    await expect(
      service.login('nobody@example.test', 'wrong'),
    ).rejects.toThrow(UnauthorizedError);
    // And the messages are identical (no existence leak).
    let first = '';
    let second = '';
    try {
      await service.login('ed@example.test', 'wrong');
    } catch (error) {
      first = (error as Error).message;
    }
    try {
      await service.login('nobody@example.test', 'wrong');
    } catch (error) {
      second = (error as Error).message;
    }
    expect(first).toBe(second);
    expect(first).toBe('Invalid credentials.');
  });

  it('locks out after 5 failures and stays generic while locked', async () => {
    const { service, users } = await makeService();
    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.login('ed@example.test', 'wrong'),
      ).rejects.toThrow('Invalid credentials.');
    }
    const user = users.byId.get('user-editor');
    expect(user?.failedAttempts).toBe(5);
    expect(user?.lockedUntil).not.toBeNull();
    // Even the right password fails generically while locked.
    await expect(
      service.login('ed@example.test', 'correct horse'),
    ).rejects.toThrow('Invalid credentials.');
  });

  it('rotates refresh tokens and detects reuse by revoking the family', async () => {
    const { service, tokens } = await makeService();
    const first = await service.login('ed@example.test', 'correct horse');
    const second = await service.refresh(first.tokens.refreshToken);
    expect(second.tokens.refreshToken).not.toBe(first.tokens.refreshToken);
    // Old token is now rotated: presenting it again is reuse.
    await expect(
      service.refresh(first.tokens.refreshToken),
    ).rejects.toThrow('Invalid credentials.');
    // The whole family is revoked: even the new token is dead.
    await expect(
      service.refresh(second.tokens.refreshToken),
    ).rejects.toThrow('Invalid credentials.');
    const revoked = [...tokens.byHash.values()].filter(
      (token) => token.revokedAt !== null,
    );
    expect(revoked.length).toBe(2);
  });

  it('refuses refresh past the absolute session bound', async () => {
    const { service, tokens } = await makeService();
    const first = await service.login('ed@example.test', 'correct horse');
    const row = tokens.byHash.get(hashRefreshToken(first.tokens.refreshToken));
    expect(row).toBeDefined();
    if (row) {
      row.absoluteExpiresAt = new Date(Date.now() - 1000);
    }
    await expect(
      service.refresh(first.tokens.refreshToken),
    ).rejects.toThrow('Invalid credentials.');
  });

  it('logout revokes the token and is idempotent', async () => {
    const { service } = await makeService();
    const first = await service.login('ed@example.test', 'correct horse');
    await service.logout(first.tokens.refreshToken);
    await expect(
      service.refresh(first.tokens.refreshToken),
    ).rejects.toThrow('Invalid credentials.');
    await expect(
      service.logout(first.tokens.refreshToken),
    ).resolves.toBeUndefined();
    await expect(
      service.logout('bogus-token'),
    ).resolves.toBeUndefined();
  });

  it('rejects malformed and foreign access tokens', async () => {
    const { service } = await makeService();
    expect(() => service.verifyAccess('not-a-token')).toThrow(
      UnauthorizedError,
    );
    expect(() => service.verifyAccess('')).toThrow(UnauthorizedError);
  });
});
