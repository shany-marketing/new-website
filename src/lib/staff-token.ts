import { createHmac } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StaffTokenPayload {
  staffMemberId: string;
  hotelId: string;
}

function base64url(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function generateStaffToken(staffMemberId: string, hotelId: string): string {
  const payload = base64url(
    JSON.stringify({
      staffMemberId,
      hotelId,
      exp: Date.now() + EXPIRY_MS,
    })
  );
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyStaffToken(token: string): StaffTokenPayload | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const expectedSig = sign(payload);
    if (sig !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.staffMemberId || !data.hotelId) return null;
    if (data.exp && data.exp < Date.now()) return null;

    return { staffMemberId: data.staffMemberId, hotelId: data.hotelId };
  } catch {
    return null;
  }
}
