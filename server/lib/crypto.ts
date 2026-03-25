import crypto from "crypto";

const SECRET_KEY = process.env.ENCRYPTION_KEY || "";

function getKeyBuffer(): Buffer {
  if (!SECRET_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(SECRET_KEY)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(SECRET_KEY, "hex");
}

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKeyBuffer(), iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted, authTagHex] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKeyBuffer(), iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
