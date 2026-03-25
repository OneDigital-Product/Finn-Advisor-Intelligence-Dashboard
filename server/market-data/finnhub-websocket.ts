// TODO: Finnhub WebSocket client is implemented but NOT currently active in production.
// It provides real-time streaming price updates (sub-second) for subscribed tickers.
// Currently disabled because:
//   1. The frontend polls via REST every 30s which is sufficient for advisor use
//   2. WebSocket requires a persistent connection and FINNHUB_API_KEY in .env
//   3. Free tier: 1 WebSocket connection, 50 symbols max
// To activate: set FINNHUB_WEBSOCKET_ENABLED=true in .env
// The websocket-holder.ts manages lifecycle and the bootstrap.ts initializes it.
import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { logger } from "../lib/logger";

interface WebSocketMessage {
  type: string;
  data: any;
}

export class FinnhubWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private subscribers: Map<string, Set<string>> = new Map();

  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.info("Finnhub WebSocket connected");
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit("connected");
          this.resubscribeAll();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            logger.error({ err: error }, "Failed to parse WebSocket message");
          }
        };

        this.ws.onerror = (error) => {
          logger.error({ err: error }, "WebSocket error");
          reject(error);
        };

        this.ws.onclose = () => {
          logger.warn("Finnhub WebSocket disconnected");
          this.emit("disconnected");
          this.attemptReconnect();
        };
      } catch (error) {
        logger.error({ err: error }, "Failed to connect WebSocket");
        reject(error);
      }
    });
  }

  subscribe(clientId: string, ticker: string): void {
    const upperTicker = ticker.toUpperCase();

    if (!this.subscribers.has(upperTicker)) {
      this.subscribers.set(upperTicker, new Set());
    }
    const subs = this.subscribers.get(upperTicker)!;
    const isFirst = subs.size === 0;
    subs.add(clientId);

    if (isFirst && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", symbol: upperTicker }));
      logger.debug({ ticker: upperTicker }, "Subscribed to ticker on WS");
    }
  }

  unsubscribe(clientId: string, ticker: string): void {
    const upperTicker = ticker.toUpperCase();
    const subs = this.subscribers.get(upperTicker);

    if (subs) {
      subs.delete(clientId);

      if (subs.size === 0) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "unsubscribe", symbol: upperTicker }));
          logger.debug({ ticker: upperTicker }, "Unsubscribed from ticker on WS");
        }
        this.subscribers.delete(upperTicker);
      }
    }
  }

  unsubscribeAll(clientId: string): void {
    for (const [ticker, subs] of this.subscribers.entries()) {
      subs.delete(clientId);
      if (subs.size === 0) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "unsubscribe", symbol: ticker }));
        }
        this.subscribers.delete(ticker);
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === "trade") {
      for (const trade of message.data || []) {
        const ticker = trade.s;
        const price = trade.p;
        const change = price - (trade.pc || price);
        this.emit("priceUpdate", ticker, price, change);
      }
    } else if (message.type === "ping") {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "pong" }));
      }
    }
  }

  private resubscribeAll(): void {
    for (const ticker of this.subscribers.keys()) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "subscribe", symbol: ticker }));
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Finnhub WS: max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    logger.info({ attempt: this.reconnectAttempts, delay }, "Attempting WS reconnection");

    setTimeout(() => {
      this.connect().catch((error) => {
        logger.warn({ err: error }, "WS reconnection failed");
      });
    }, Math.min(delay, 60000));
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getSubscribedTickers(): string[] {
    return Array.from(this.subscribers.keys());
  }

  getSubscriberCount(ticker: string): number {
    return this.subscribers.get(ticker.toUpperCase())?.size || 0;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
