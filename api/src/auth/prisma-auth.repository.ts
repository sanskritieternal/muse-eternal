import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseUnavailableError } from '../common/errors';
import {
  RefreshTokenRepository,
  RefreshTokenRow,
  StaffUserRow,
  UserRepository,
} from './auth.repository';

/** Shared lazy-guarded Prisma client (same no-DB contract as Phase 2). */
function buildClient(): PrismaClient | null {
  try {
    return new PrismaClient();
  } catch {
    return null;
  }
}

function asUnavailable(error: unknown): Error {
  if (error instanceof DatabaseUnavailableError) {
    return error;
  }
  return new DatabaseUnavailableError();
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  private readonly client = buildClient();

  async findByEmail(email: string): Promise<StaffUserRow | null> {
    try {
      const row = await this.requireClient().staffUser.findUnique({
        where: { email },
      });
      return row ? toUserRow(row) : null;
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async findById(id: string): Promise<StaffUserRow | null> {
    try {
      const row = await this.requireClient().staffUser.findUnique({
        where: { id },
      });
      return row ? toUserRow(row) : null;
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async save(user: StaffUserRow): Promise<StaffUserRow> {
    try {
      const row = await this.requireClient().staffUser.update({
        data: {
          failedAttempts: user.failedAttempts,
          lockedUntil: user.lockedUntil,
          passwordHash: user.passwordHash,
          roles: user.roles,
        },
        where: { id: user.id },
      });
      return toUserRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  private requireClient(): PrismaClient {
    if (!this.client) {
      throw new DatabaseUnavailableError();
    }
    return this.client;
  }
}

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  private readonly client = buildClient();

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    try {
      const row = await this.requireClient().refreshToken.findUnique({
        where: { tokenHash },
      });
      return row ? toTokenRow(row) : null;
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async save(token: RefreshTokenRow): Promise<RefreshTokenRow> {
    try {
      const row = await this.requireClient().refreshToken.upsert({
        create: {
          absoluteExpiresAt: token.absoluteExpiresAt,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          familyId: token.familyId,
          id: token.id,
          revokedAt: token.revokedAt,
          revokedReason: token.revokedReason,
          tokenHash: token.tokenHash,
          userId: token.userId,
        },
        update: {
          revokedAt: token.revokedAt,
          revokedReason: token.revokedReason,
        },
        where: { tokenHash: token.tokenHash },
      });
      return toTokenRow(row);
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
    try {
      await this.requireClient().refreshToken.updateMany({
        data: { revokedAt: new Date(), revokedReason: reason },
        where: { familyId, revokedAt: null },
      });
    } catch (error) {
      throw asUnavailable(error);
    }
  }

  private requireClient(): PrismaClient {
    if (!this.client) {
      throw new DatabaseUnavailableError();
    }
    return this.client;
  }
}

function toUserRow(row: {
  createdAt: Date;
  email: string;
  failedAttempts: number;
  id: string;
  lockedUntil: Date | null;
  passwordHash: string;
  roles: string[];
  updatedAt: Date;
}): StaffUserRow {
  return { ...row };
}

function toTokenRow(row: {
  absoluteExpiresAt: Date;
  createdAt: Date;
  expiresAt: Date;
  familyId: string;
  id: string;
  revokedAt: Date | null;
  revokedReason: string | null;
  tokenHash: string;
  userId: string;
}): RefreshTokenRow {
  return { ...row };
}
