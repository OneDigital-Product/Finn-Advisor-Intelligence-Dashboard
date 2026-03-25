import crypto from "crypto";

export function generateSignature(payload: Buffer, apiKey: string): string {
  const hmac = crypto.createHmac("sha256", apiKey);
  hmac.update(payload);
  return `sha256=${hmac.digest("base64")}`;
}

export function verifySignature(payload: Buffer, signature: string, apiKey: string): boolean {
  try {
    const expected = generateSignature(payload, apiKey);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
