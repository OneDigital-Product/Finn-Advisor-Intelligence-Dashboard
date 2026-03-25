import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface TracedRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

interface ApiTracerContextType {
  requests: TracedRequest[];
  isRecording: boolean;
  toggleRecording: () => void;
  clearRequests: () => void;
  selectedRequest: TracedRequest | null;
  setSelectedRequest: (req: TracedRequest | null) => void;
}

const ApiTracerContext = createContext<ApiTracerContextType>({
  requests: [],
  isRecording: false,
  toggleRecording: () => {},
  clearRequests: () => {},
  selectedRequest: null,
  setSelectedRequest: () => {},
});

const MAX_REQUESTS = 200;
let reqCounter = 0;

export function useApiTracer() {
  return useContext(ApiTracerContext);
}

export { ApiTracerContext };

export function createApiTracerState() {
  let requests: TracedRequest[] = [];
  let listeners: Array<() => void> = [];
  let recording = true;

  const originalFetch = globalThis.fetch;

  function notify() {
    listeners.forEach(fn => fn());
  }

  function addRequest(req: TracedRequest) {
    if (!recording) return;
    requests = [req, ...requests].slice(0, MAX_REQUESTS);
    notify();
  }

  const patchedFetch: typeof fetch = async (input, init) => {
    const id = `req-${++reqCounter}`;
    const method = init?.method || "GET";
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const start = performance.now();
    let requestBody: string | undefined;
    if (init?.body) {
      try { requestBody = typeof init.body === "string" ? init.body : JSON.stringify(init.body); } catch {}
    }

    try {
      const res = await originalFetch(input, init);
      const duration = Math.round(performance.now() - start);
      let responseBody: string | undefined;
      // Clone to read body without consuming
      const clone = res.clone();
      try { responseBody = await clone.text(); if (responseBody.length > 5000) responseBody = responseBody.slice(0, 5000) + "…"; } catch {}

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      addRequest({
        id, method, url, status: res.status, duration, timestamp: Date.now(),
        requestBody, responseBody, responseHeaders,
      });
      return res;
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      addRequest({
        id, method, url, status: 0, duration, timestamp: Date.now(),
        requestBody, error: err.message,
      });
      throw err;
    }
  };

  // Patch globally
  globalThis.fetch = patchedFetch;

  return {
    getRequests: () => requests,
    isRecording: () => recording,
    toggleRecording: () => { recording = !recording; notify(); },
    clearRequests: () => { requests = []; notify(); },
    subscribe: (fn: () => void) => {
      listeners.push(fn);
      return () => { listeners = listeners.filter(l => l !== fn); };
    },
    restore: () => { globalThis.fetch = originalFetch; },
  };
}
