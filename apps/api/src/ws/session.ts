export interface LiveSessionBridgeConfig {
  userId: string;
  sport: "table-tennis";
  personality: string;
}

export function createLiveSessionBridge(config: LiveSessionBridgeConfig) {
  return {
    status: "todo",
    config,
  };
}
