import { hash, verify } from "@node-rs/argon2";

/**
 * PASSWORD HASHING with Argon2id, the winner of the Password Hashing Competition
 * and OWASP's first recommendation.
 *
 * - A hash is ONE-WAY: we can check a password, but never recover it.
 * - Each hash includes a random SALT, so two users with the same password get
 *   different hashes, and precomputed "rainbow tables" are useless.
 * - Argon2 is deliberately SLOW and MEMORY-HUNGRY (~19 MiB here), which makes
 *   guessing billions of passwords on GPUs impractically expensive.
 *
 * Never use fast hashes like SHA-256 or MD5 for passwords.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // OWASP minimum for Argon2id

export const hashPassword = (password: string) => hash(password, OPTIONS);
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password).catch(() => false);

/**
 * A real hash of a random string. When someone logs in with an email that
 * doesn't exist, we still verify against this, so the response takes the same
 * time either way and attackers can't discover which emails are registered.
 */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword(crypto.randomUUID()));
