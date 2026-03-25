import type { FinnhubWebSocketClient } from "./finnhub-websocket";

let wsClient: FinnhubWebSocketClient | null = null;

export function setWebSocketClient(client: FinnhubWebSocketClient): void {
  wsClient = client;
}

export function getWebSocketClient(): FinnhubWebSocketClient | null {
  return wsClient;
}
