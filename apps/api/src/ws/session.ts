import type { Domain, Personality } from "@mentat/types";

export interface LiveSessionBridgeConfig {
  userId: string;
  domain: Domain;
  personality: Personality;
}

export function createLiveSessionBridge(config: LiveSessionBridgeConfig) {
  return {
    status: "todo" as const,
    config,
  };
}
