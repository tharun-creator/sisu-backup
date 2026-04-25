import crypto from "crypto";

const SESSION_COOKIE = "sisu_member_session";
const ADMIN_COOKIE = "sisu_admin_session";
const AUTH_SECRET = process.env.AUTH_SECRET || "change-me-in-env";

export const MEMBER_SESSION_COOKIE = SESSION_COOKIE;
export const ADMIN_SESSION_COOKIE = ADMIN_COOKIE;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key as Buffer);
    });
  });

  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(derivedKey.toString("hex"), "hex"),
  );
}

export function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

export function hashVerificationCode(code: string) {
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(code)
    .digest("hex");
}

export function createAdminSessionValue() {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const payload = `admin:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payload)
    .digest("hex");

  return `${payload}:${signature}`;
}

export function verifyAdminSessionValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== "admin") {
    return false;
  }

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const payload = `admin:${expiresAt}`;
  const expected = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(parts[2], "hex"),
    Buffer.from(expected, "hex"),
  );
}
