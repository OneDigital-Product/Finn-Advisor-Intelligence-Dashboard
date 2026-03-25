import { useState, useEffect, useCallback } from "react";

export interface UserSettings {
  // Dashboard
  defaultTab: string;
  widgetDensity: "compact" | "comfortable";
  autoRefreshInterval: number; // seconds, 0 = off

  // Appearance
  fontSize: "small" | "default" | "large";
  accentColor: string;
  reduceMotion: boolean;

  // Notifications
  emailDigest: "off" | "daily" | "weekly";
  alertTypes: string[];

  // Security
  sessionTimeout: number; // minutes, 0 = never

  // Shortcuts
  shortcuts: Record<string, string>;
}

const DEFAULTS: UserSettings = {
  defaultTab: "my-day",
  widgetDensity: "comfortable",
  autoRefreshInterval: 0,
  fontSize: "default",
  accentColor: "#0078A2",
  reduceMotion: false,
  emailDigest: "daily",
  alertTypes: ["compliance", "portfolio", "tasks"],
  sessionTimeout: 30,
  shortcuts: {},
};

const STORAGE_KEY = "od-user-settings";

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(settings: UserSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettingsState(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULTS);
    saveSettings(DEFAULTS);
  }, []);

  // Apply font size to document
  useEffect(() => {
    const scale = settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px";
    document.documentElement.style.setProperty("--settings-font-size", scale);
  }, [settings.fontSize]);

  // Apply reduce motion
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.reduceMotion]);

  return { settings, updateSetting, resetSettings };
}
