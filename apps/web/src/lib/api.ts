import type {
  FinalizeSessionRequest,
  FinalizeSessionResponse,
  ProgressResponse,
  SessionContextResponse,
  StartSessionRequest,
  StartSessionResponse,
} from "@mentat/types";

export const apiBaseUrl = "/api";

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || "Request failed", response.status);
  }

  return (await response.json()) as T;
}

export async function fetchSessionContext(
  userId: string,
): Promise<SessionContextResponse> {
  return requestJson<SessionContextResponse>(
    `/sessions/context/${encodeURIComponent(userId)}`,
  );
}

export async function startSession(
  payload: StartSessionRequest,
): Promise<StartSessionResponse> {
  return requestJson<StartSessionResponse>("/sessions/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function finalizeActiveSession(
  payload: FinalizeSessionRequest,
): Promise<FinalizeSessionResponse> {
  return requestJson<FinalizeSessionResponse>("/sessions/finalize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchProgress(
  userId: string,
): Promise<ProgressResponse> {
  return requestJson<ProgressResponse>(
    `/progress/${encodeURIComponent(userId)}`,
  );
}
