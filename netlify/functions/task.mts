import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { tasks } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { getUser } from "../lib/auth.js";

const STATUS_CYCLE: Record<string, string> = {
  Pending: "Working",
  Working: "done",
  done: "Pending",
};

export default async (req: Request, context: Context) => {
  const user = getUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = parseInt(context.params.id, 10);
  if (isNaN(taskId)) {
    return Response.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.userId)));

  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  if (req.method === "POST") {
    const newStatus = STATUS_CYCLE[task.status] ?? "Pending";
    const [updated] = await db
      .update(tasks)
      .set({ status: newStatus })
      .where(eq(tasks.id, taskId))
      .returning();
    return Response.json({ task: updated });
  }

  if (req.method === "DELETE") {
    await db.delete(tasks).where(eq(tasks.id, taskId));
    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/tasks/:id",
  method: ["POST", "DELETE"],
};
