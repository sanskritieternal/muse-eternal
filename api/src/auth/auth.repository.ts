/** Injection tokens for the auth data layer. */
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

export interface StaffUserRow {
  createdAt: Date;
  email: string;
  failedAttempts: number;
  id: string;
  lockedUntil: Date | null;
  passwordHash: string;
  roles: string[];
  updatedAt: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<StaffUserRow | null>;
  findById(id: string): Promise<StaffUserRow | null>;
  save(user: StaffUserRow): Promise<StaffUserRow>;
}

export interface RefreshTokenRow {
  absoluteExpiresAt: Date;
  createdAt: Date;
  expiresAt: Date;
  familyId: string;
  id: string;
  revokedAt: Date | null;
  revokedReason: string | null;
  tokenHash: string;
  userId: string;
}

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshTokenRow | null>;
  save(token: RefreshTokenRow): Promise<RefreshTokenRow>;
  /** Revoke every token in the family (reuse detection path). */
  revokeFamily(familyId: string, reason: string): Promise<void>;
}
