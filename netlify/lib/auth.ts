import { createHmac } from "crypto";

export interface TokenPayload {
  userId: number;
  username: string;
  exp: number;
}

export function createToken(userId: number, username: string): string {
  const secret = Netlify.env.get("JWT_SECRET") || "dev-secret-change-in-production";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ userId, username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = Netlify.env.get("JWT_SECRET") || "dev-secret-change-in-production";
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expectedSig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
    if (sig !== expectedSig) return null;
    const data: TokenPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getUser(req: Request): TokenPayload | null {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  return verifyToken(token);
}
