import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString(
    "hex"
  );

  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, iterationString, salt, expectedHashHex] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationString || !salt || !expectedHashHex) {
    return false;
  }

  const iterations = Number(iterationString);
  if (Number.isNaN(iterations)) {
    return false;
  }

  const derivedHash = pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  const expectedHash = Buffer.from(expectedHashHex, "hex");

  if (expectedHash.length !== derivedHash.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, derivedHash);
}
