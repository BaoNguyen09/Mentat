import { Hono } from "hono";
import type {
  StartSessionRequest,
  StartSessionResponse,
  FinalizeSessionRequest,
  SessionContextResponse,
} from "@mentat/types";

import { createLiveSessionBridge, releaseLiveSession } from "../ws/session.js";
import { finalizeSession } from "../services/session.js";
import { getRecentSessionSummaries } from "../repositories/sessions.js";
import { getUserProfile } from "../repositories/users.js";

export const sessionRoutes = new Hono()
  .get("/context/:userId", async (c) => {
    const userId = c.req.param("userId");
    const [recentSummaries, profile] = await Promise.all([
      getRecentSessionSummaries(userId, 5),
      getUserProfile(userId),
    ]);
    const latestSummary = recentSummaries[0];

    const accountability =
      latestSummary?.fixList.map((fix) => fix.drill).slice(0, 5) ?? [];
    const latestFixList = latestSummary?.fixList ?? [];
    const memoryDigest = recentSummaries
      .map((summary) => summary.compressedSummary)
      .filter(Boolean)
      .slice(0, 3);

    const response: SessionContextResponse = {
      userId,
      domain: profile.domains[0] ?? "table-tennis",
      recentSummaries,
      accountability:
        accountability.length > 0
          ? accountability
          : [
              "Practice backhand topspin for 15 minutes",
              "Focus on recovery stance after each shot",
            ],
      latestFixList,
      memoryDigest,
      profile,
    };
    return c.json(response);
  })
  .post("/start", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as StartSessionRequest;

    const recentSummaries = await getRecentSessionSummaries(body.userId, 3);
    const latestSummary = recentSummaries[0];
    const accountability =
      latestSummary?.fixList.map((fix) => fix.drill).slice(0, 5) ?? [];
    const recentFixItems =
      latestSummary?.fixList.map((fix) => fix.item).slice(0, 5) ?? [];
    const memoryDigest = recentSummaries
      .map((summary) => summary.compressedSummary)
      .filter(Boolean)
      .slice(0, 3);

    const bridge = createLiveSessionBridge({
      userId: body.userId,
      domain: body.domain,
      personality: body.personality,
      accountability,
      recentFixItems,
      memoryDigest,
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
    )) as FinalizeSessionRequest & {
      domain?: string;
      personality?: string;
      durationSeconds?: number;
      coachTranscript?: string[];
    };

    if (body.sessionId) {
      releaseLiveSession(body.sessionId);
    }

    const result = await finalizeSession({
      sessionId: body.sessionId ?? `session-${Date.now()}`,
      userId: body.userId ?? "unknown",
      domain: (body.domain as any) ?? "table-tennis",
      personality: (body.personality as any) ?? "sensei",
      durationSeconds: body.durationSeconds ?? 300,
      coachTranscript: body.coachTranscript ?? [],
    });

    return c.json(result);
  });
