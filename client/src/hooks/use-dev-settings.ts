import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "od-dev-settings";

export interface DevSettings {
  /** Show data source provenance badges on client detail fields */
  showDataSources: boolean;
  /** Show field-level diagnostics (empty vs populated) */
  showFieldDiagnostics: boolean;
}

const DEFAULTS: DevSettings = {
  showDataSources: true,
  showFieldDiagnostics: false,
};

function read(): DevSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export function useDevSettings() {
  const [settings, setSettings] = useState<DevSettings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
    // Broadcast to other components via custom event
    window.dispatchEvent(new CustomEvent("od-dev-settings-changed", { detail: settings }));
  }, [settings]);

  // Listen for changes from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DevSettings>).detail;
      setSettings(prev => {
        if (JSON.stringify(prev) === JSON.stringify(detail)) return prev;
        return detail;
      });
    };
    window.addEventListener("od-dev-settings-changed", handler);
    return () => window.removeEventListener("od-dev-settings-changed", handler);
  }, []);

  const toggle = useCallback((key: keyof DevSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { settings, toggle, setSettings };
}

/** Lightweight read-only check — no state, no re-renders */
export function isDataSourceDiagEnabled(): boolean {
  return read().showDataSources;
}
