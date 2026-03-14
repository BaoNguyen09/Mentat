import { Hono } from "hono";
import type { ProgressResponse } from "@mentat/types";
import { getRecentSessionSummaries } from "../repositories/sessions.js";
import { getProgressSnapshot } from "../repositories/users.js";

export const progressRoutes = new Hono().get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  const [snapshot, recentSessions] = await Promise.all([
    getProgressSnapshot(userId, "table-tennis"),
    getRecentSessionSummaries(userId, 10),
  ]);

  const response: ProgressResponse = {
    snapshot,
    recentSessions,
  };

  return c.json(response);
});
