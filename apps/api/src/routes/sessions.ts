import { Hono } from "hono";
import type {
  StartSessionRequest,
  StartSessionResponse,
  FinalizeSessionRequest,
  FinalizeSessionResponse,
  SessionContextResponse,
} from "@mentat/types";

import { createLiveSessionBridge, releaseLiveSession } from "../ws/session";

export const sessionRoutes = new Hono()
  .get("/context/:userId", (c) => {
    const userId = c.req.param("userId");
    const response: SessionContextResponse = {
      userId,
      domain: "table-tennis",
      recentSummaries: [],
      accountability: [
        "Practice backhand topspin for 15 minutes",
        "Focus on recovery stance after each shot",
      ],
      profile: {
        userId,
        name: "Alex",
        domains: ["table-tennis"],
        streak: 3,
        createdAt: "2026-03-01T00:00:00Z",
      },
    };
    return c.json(response);
  })
  .post("/start", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as StartSessionRequest;
    const bridge = createLiveSessionBridge({
      userId: body.userId,
      domain: body.domain,
      personality: body.personality,
    });
    const response: StartSessionResponse = {
      sessionId: bridge.sessionId,
      wsUrl: bridge.wsUrl,
      status: bridge.status,
    };
    return c.json(response);
  })
  .post("/finalize", async (c) => {
    const body = (await c.req.json().catch(
      () => ({})
    )) as FinalizeSessionRequest;
    if (body.sessionId) {
      releaseLiveSession(body.sessionId);
    }
    const response: FinalizeSessionResponse = {
      status: "complete",
      summary: {
        sessionId: body.sessionId ?? "unknown",
        sessionDate: new Date().toISOString(),
        domain: "table-tennis",
        personality: "sensei",
        durationSeconds: 300,
        topScores: [
          { area: "technique", score: 8 },
          { area: "engagement", score: 9 },
        ],
        weakAreas: [
          { area: "formAccuracy", score: 5 },
          { area: "consistency", score: 6 },
        ],
        memorableMoments: [
          "Great backhand recovery at 2:30",
          "Solid footwork improvement",
        ],
        fixList: [
          {
            item: "Paddle angle on forehand",
            specificObservation:
              "Paddle face too open on contact, causing pop-ups",
            drill: "Shadow swing 20 reps with closed face focus",
          },
          {
            item: "Recovery stance",
            specificObservation: "Staying flat-footed after serve return",
            drill: "Bounce on balls of feet between each rally",
          },
        ],
        keyImprovement:
          "Backhand topspin consistency improved from last session",
      },
    };
    return c.json(response);
  });
