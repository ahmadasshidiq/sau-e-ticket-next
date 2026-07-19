import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string, salt?: string) {
  const nextSalt = salt ?? randomBytes(16).toString("hex");
  const hashedPassword = scryptSync(password, nextSalt, 64).toString("hex");

  return {
    salt: nextSalt,
    hashedPassword,
  };
}

export function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
) {
  const computedHash = hashPassword(password, salt).hashedPassword;

  return timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}
