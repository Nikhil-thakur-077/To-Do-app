import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { tasks } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getUser } from "../lib/auth.js";

export default async (req: Request) => {
  const user = getUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.method === "GET") {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.userId))
      .orderBy(tasks.createdAt);
    return Response.json({ tasks: userTasks });
  }

  if (req.method === "POST") {
    let body: { title?: string } = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { title } = body;
    if (!title || !title.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    const [task] = await db
      .insert(tasks)
      .values({ userId: user.userId, title: title.trim(), status: "Pending" })
      .returning();
    return Response.json({ task }, { status: 201 });
  }

  if (req.method === "DELETE") {
    await db.delete(tasks).where(eq(tasks.userId, user.userId));
    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/tasks",
  method: ["GET", "POST", "DELETE"],
};
