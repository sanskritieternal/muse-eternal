import * as crypto from 'node:crypto';

/** Injection token for the auth configuration. */
export const AUTH_CONFIG = 'AUTH_CONFIG';

/**
 * Auth parameters. S01 K-2 fixes the session bound (default 60 min);
 * the remaining numbers are implementation choices for this slice —
 * the specs require lockout and rotation but name no counts, so the
 * values below are recorded here (and in api/README.md), not claimed
 * as spec decisions. All are env-overridable.
 */
export interface AuthConfig {
  accessTtlMinutes: number;
  sessionTimeoutMinutes: number;
  lockoutAttempts: number;
  lockoutMinutes: number;
  jwtSecret: string;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadAuthConfig(): AuthConfig {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }
    // Dev-only fallback. Loud on purpose: never use this in production.
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: JWT_SECRET is unset; using a dev-only fallback secret. ' +
        'Set JWT_SECRET before any real deployment.',
    );
    return {
      accessTtlMinutes: envInt('JWT_ACCESS_TTL_MINUTES', 15),
      jwtSecret: 'dev-only-secret-do-not-use-in-production',
      lockoutAttempts: envInt('LOCKOUT_ATTEMPTS', 5),
      lockoutMinutes: envInt('LOCKOUT_MINUTES', 15),
      sessionTimeoutMinutes: envInt('SESSION_TIMEOUT_MINUTES', 60),
    };
  }
  return {
    accessTtlMinutes: envInt('JWT_ACCESS_TTL_MINUTES', 15),
    jwtSecret: secret,
    lockoutAttempts: envInt('LOCKOUT_ATTEMPTS', 5),
    lockoutMinutes: envInt('LOCKOUT_MINUTES', 15),
    sessionTimeoutMinutes: envInt('SESSION_TIMEOUT_MINUTES', 60),
  };
}

/** Opaque refresh token + its SHA-256 hash (hashes are what persist). */
export function newRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
