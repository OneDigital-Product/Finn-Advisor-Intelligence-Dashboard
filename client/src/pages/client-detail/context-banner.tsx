"use client";

import { useState, useEffect } from "react";
import { P } from "@/styles/tokens";

interface ContextBannerProps {
  navigationContext: {
    from: string | null;
    signal: string | null;
    signalId: string | null;
  } | null;
}

const SIGNAL_MESSAGES: Record<string, string> = {
  "continue-working": "Continuing from your recent work",
  "profile-reminder": "This client has a profile review due",
  "task": "You have a pending task for this client",
  "case": "This client has an open case that needs attention",
  "meeting-prep": "Preparing for your upcoming meeting",
};

const AUTO_DISMISS_MS = 8000;

export function ContextBanner({ navigationContext }: ContextBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!navigationContext) return;
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [navigationContext]);

  if (!navigationContext || !navigationContext.signal || !visible) return null;

  const message = SIGNAL_MESSAGES[navigationContext.signal] || `Navigated from ${navigationContext.from || "My Day"}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        marginBottom: 12,
        background: "rgba(79,179,205,0.08)",
        border: `1px solid rgba(79,179,205,0.2)`,
        borderRadius: 6,
        fontSize: 12,
        color: P.odLBlue,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "none",
          border: "none",
          color: P.odT3,
          cursor: "pointer",
          fontSize: 14,
          padding: "0 0 0 12px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
