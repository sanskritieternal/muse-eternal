import * as argon2 from 'argon2';

/**
 * Password hashing: argon2id (the same family S01 D-4 mandates for API
 * key secrets). Verification is constant-time via the library.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash: fail closed, never throw into the caller.
    return false;
  }
}
