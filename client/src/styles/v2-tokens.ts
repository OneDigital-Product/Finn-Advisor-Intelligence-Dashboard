/**
 * V2 Design Tokens — OneDigital Wealth Advisory
 *
 * Shared style constants used across all client-detail section pages.
 * SINGLE SOURCE OF TRUTH — never define these locally in section files.
 *
 * Cards use V2_CARD + V2_DARK_SCOPE className, headings use V2_TITLE,
 * uppercase labels use V2_LABEL, interactive row items use V2_ROW.
 *
 * V2_DARK_SCOPE forces Tailwind HSL variables (--foreground, --muted-foreground)
 * to dark-mode values inside forced-dark OD surfaces — without it, classes like
 * text-muted-foreground render invisible dark text on dark backgrounds.
 */
import React from "react";

// Tailwind HSL scope class — apply to any container using V2_CARD or V2_ROW
export const V2_DARK_SCOPE = "v2-dark-scope";

// ─── Card container ────────────────────────────────────────────────
export const V2_CARD: React.CSSProperties = {
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-subtle)",
  borderRadius: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  color: "var(--color-text-secondary)",
};

// ─── Section heading (uppercase, Oswald) ───────────────────────────
export const V2_TITLE: React.CSSProperties = {
  fontFamily: "'Oswald', 'Inter', system-ui, sans-serif",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: ".04em",
  textTransform: "uppercase" as const,
  color: "var(--color-text-secondary)",
};

// ─── Uppercase micro-label (JetBrains Mono) ────────────────────────
export const V2_LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  color: "var(--color-text-secondary)",
};

// ─── Interactive row item ──────────────────────────────────────────
export const V2_ROW: React.CSSProperties = {
  background: "var(--color-surface-overlay)",
  borderRadius: 6,
  border: "1px solid var(--color-border-subtle)",
  color: "var(--color-text-primary)",
};
