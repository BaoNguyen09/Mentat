import { useCallback, useEffect, useState } from "react";

import type { DomainKnowledgeEntry, KnowledgeSource } from "@mentat/types";

import {
  fetchKnowledgeEntries,
  syncKnowledgeToObsidian,
  trackKnowledgeEntry,
} from "../lib/api";

type LoadState = "idle" | "loading" | "ready" | "error";

interface TrackKnowledgeInput {
  domainGroup: string;
  subdomain: string;
  transcript: string;
  source: KnowledgeSource;
}

export function useKnowledge(userId: string) {
  const [entries, setEntries] = useState<DomainKnowledgeEntry[]>([]);
  const [status, setStatus] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId.trim()) {
      setEntries([]);
      setStatus("idle");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetchKnowledgeEntries(userId.trim());
      setEntries(response.entries);
      setStatus("ready");
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to load knowledge entries.";
      setStatus("error");
      setError(message);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async (input: TrackKnowledgeInput) => {
      setError(null);
      setSyncMessage(null);

      try {
        const response = await trackKnowledgeEntry({
          userId: userId.trim(),
          domainGroup: input.domainGroup,
          subdomain: input.subdomain,
          transcript: input.transcript,
          source: input.source,
        });

        setEntries((current) => [response.entry, ...current]);
        return response.entry;
      } catch (nextError) {
        const message =
          nextError instanceof Error
            ? nextError.message
            : "Unable to save this knowledge entry.";
        setError(message);
        throw nextError;
      }
    },
    [userId],
  );

  const sync = useCallback(async () => {
    setError(null);

    try {
      const response = await syncKnowledgeToObsidian({
        userId: userId.trim(),
      });

      setSyncMessage(
        `Synced ${response.pages.length} Obsidian pages at ${new Date(
          response.syncedAt,
        ).toLocaleTimeString()}.`,
      );

      return response;
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to sync knowledge to Obsidian.";
      setError(message);
      throw nextError;
    }
  }, [userId]);

  return {
    entries,
    status,
    error,
    syncMessage,
    refresh,
    saveEntry,
    sync,
  };
}
