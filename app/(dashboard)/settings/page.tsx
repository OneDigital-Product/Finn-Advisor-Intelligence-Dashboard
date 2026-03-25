"use client";

import { Suspense } from "react";
import SettingsPage from "@/pages/settings";

export default function SettingsRoute() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "var(--color-text-muted)" }}>Loading settings...</div>}>
      <SettingsPage />
    </Suspense>
  );
}
