import type { Config, Context } from "@netlify/functions";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { createToken } from "../lib/auth.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const newHash = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, newHash);
}

export default async (req: Request, context: Context) => {
  const action = context.params.action;

  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return Response.json({ error: "Username and password are required" }, { status: 400 });
  }
  if (username.length < 3 || username.length > 50) {
    return Response.json({ error: "Username must be 3–50 characters" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (action === "register") {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      return Response.json({ error: "Username already exists" }, { status: 409 });
    }
    const passwordHash = hashPassword(password);
    const [user] = await db.insert(users).values({ username, passwordHash }).returning();
    const token = createToken(user.id, user.username);
    return Response.json({ token, username: user.username }, { status: 201 });
  }

  if (action === "login") {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const token = createToken(user.id, user.username);
    return Response.json({ token, username: user.username });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = {
  path: "/api/auth/:action",
  method: ["POST"],
};
