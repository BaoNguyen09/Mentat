import { Hono } from "hono";
import type {
  KnowledgeFeedResponse,
  SyncKnowledgeToObsidianRequest,
  SyncKnowledgeToObsidianResponse,
  TrackKnowledgeEntryRequest,
  TrackKnowledgeEntryResponse,
} from "@mentat/types";

import { getKnowledgeEntries, saveKnowledgeEntry } from "../repositories/knowledge.js";
import { createKnowledgeEntry } from "../services/knowledge.js";
import { syncKnowledgeToObsidian } from "../services/obsidian.js";

export const knowledgeRoutes = new Hono()
  .get("/:userId", async (c) => {
    const userId = c.req.param("userId");
    const response: KnowledgeFeedResponse = {
      userId,
      entries: await getKnowledgeEntries(userId),
    };
    return c.json(response);
  })
  .post("/track", async (c) => {
    const body = (await c.req.json()) as TrackKnowledgeEntryRequest;
    const entry = createKnowledgeEntry(body);
    await saveKnowledgeEntry(entry);

    const response: TrackKnowledgeEntryResponse = {
      entry,
    };

    return c.json(response);
  })
  .post("/sync", async (c) => {
    const body = (await c.req.json()) as SyncKnowledgeToObsidianRequest;
    const entries = await getKnowledgeEntries(body.userId);
    const pages = await syncKnowledgeToObsidian(body.userId, entries);

    const response: SyncKnowledgeToObsidianResponse = {
      userId: body.userId,
      pages,
      syncedAt: new Date().toISOString(),
    };

    return c.json(response);
  });
