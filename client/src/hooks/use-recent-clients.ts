import { useState, useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "onedigital-recent-clients";
const MAX_RECENT = 5;
const SYNC_EVENT = "recent-clients-updated";

export interface RecentClient {
  id: string;
  name: string;
  segment?: string;
  viewedAt?: number; // Unix ms — Date.now() at time of visit
}

function readRecents(): RecentClient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRecents(clients: RecentClient[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

let snapshot = readRecents();

function subscribe(cb: () => void) {
  const handler = () => {
    snapshot = readRecents();
    cb();
  };
  window.addEventListener(SYNC_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SYNC_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useRecentClients() {
  const recents = useSyncExternalStore(subscribe, getSnapshot);

  const addRecent = useCallback((client: RecentClient) => {
    const current = readRecents();
    const filtered = current.filter(c => c.id !== client.id);
    const stamped = { ...client, viewedAt: Date.now() };
    const updated = [stamped, ...filtered].slice(0, MAX_RECENT);
    writeRecents(updated);
  }, []);

  return { recents, addRecent };
}
