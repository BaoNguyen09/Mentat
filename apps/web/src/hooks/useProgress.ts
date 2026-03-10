import { useCallback, useEffect, useState } from "react";

import type { ProgressResponse } from "@mentat/types";

import { fetchProgress } from "../lib/api";

type ProgressLoadState = "idle" | "loading" | "ready" | "error";

export function useProgress(userId: string) {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [status, setStatus] = useState<ProgressLoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId.trim()) {
      setData(null);
      setStatus("idle");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const next = await fetchProgress(userId.trim());
      setData(next);
      setStatus("ready");
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to load progress.";
      setStatus("error");
      setError(message);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    status,
    error,
    refresh,
  };
}
