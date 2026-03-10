import { Hono } from "hono";
import type { ProgressResponse } from "@mentat/types";

export const progressRoutes = new Hono().get("/:userId", (c) => {
  const userId = c.req.param("userId");
  const response: ProgressResponse = {
    snapshot: {
      userId,
      domain: "table-tennis",
      streak: 3,
      sessionsCompleted: 7,
    },
    recentSessions: [
      {
        sessionId: "session-001",
        sessionDate: "2026-03-09T14:00:00Z",
        domain: "table-tennis",
        personality: "sensei",
        durationSeconds: 420,
        topScores: [
          { area: "technique", score: 8 },
          { area: "engagement", score: 9 },
        ],
        weakAreas: [
          { area: "formAccuracy", score: 5 },
          { area: "consistency", score: 6 },
        ],
        memorableMoments: ["Solid backhand rally"],
        fixList: [
          {
            item: "Paddle angle",
            specificObservation: "Too open on forehand",
            drill: "Shadow swing 20 reps",
          },
        ],
        keyImprovement: "Footwork recovery time cut by 0.5s",
      },
    ],
  };
  return c.json(response);
});
