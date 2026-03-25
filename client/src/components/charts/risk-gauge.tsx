"use client";

import React, { useMemo } from "react";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

// ── Types ────────────────────────────────────────────────────────────
interface RiskGaugeProps {
  score: number; // 0-100
  label?: string; // default "Portfolio Risk"
  size?: number; // default 180
  breakdown?: { label: string; value: number; description: string }[]
  sourceBadge?: React.ReactNode;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(152, 69%, 40%)";
  if (score >= 60) return "hsl(41, 100%, 49%)";
  if (score >= 40) return "hsl(24, 100%, 55%)";
  return "hsl(0, 72%, 51%)";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Low Risk";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Elevated";
  return "High Risk";
}

// ── Component ────────────────────────────────────────────────────────

export function RiskGauge({
  score,
  label = "Portfolio Risk",
  size = 180,
  breakdown,
  sourceBadge,
}: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));

  const { cx, cy, r, scoreColor, scoreLabel, trackD, arcD, needleX, needleY } =
    useMemo(() => {
      const _cx = size / 2;
      const _cy = size / 2 + 10;
      const _r = size / 2 - 20;
      const _color = getScoreColor(clamped);
      const _label = getScoreLabel(clamped);

      // Semicircle: π (left, 180°) → 0 (right, 0°)
      // Score 0 = left (π), Score 100 = right (0)
      const startAngle = Math.PI; // left end
      const endAngle = 0; // right end

      // Background track — full semicircle from left to right
      const trackStartX = _cx + _r * Math.cos(startAngle);
      const trackStartY = _cy - _r * Math.sin(startAngle);
      const trackEndX = _cx + _r * Math.cos(endAngle);
      const trackEndY = _cy - _r * Math.sin(endAngle);
      const _trackD = `M ${trackStartX} ${trackStartY} A ${_r} ${_r} 0 1 1 ${trackEndX} ${trackEndY}`;

      // Colored arc — partial, left up to score position
      const scoreAngle = Math.PI - (clamped / 100) * Math.PI;
      const arcEndX = _cx + _r * Math.cos(scoreAngle);
      const arcEndY = _cy - _r * Math.sin(scoreAngle);
      const largeArc = clamped > 50 ? 1 : 0;
      const _arcD =
        clamped > 0
          ? `M ${trackStartX} ${trackStartY} A ${_r} ${_r} 0 ${largeArc} 1 ${arcEndX} ${arcEndY}`
          : "";

      // Needle endpoint
      const needleLen = _r - 8;
      const _needleX = _cx + needleLen * Math.cos(scoreAngle);
      const _needleY = _cy - needleLen * Math.sin(scoreAngle);

      return {
        cx: _cx,
        cy: _cy,
        r: _r,
        scoreColor: _color,
        scoreLabel: _label,
        trackD: _trackD,
        arcD: _arcD,
        needleX: _needleX,
        needleY: _needleY,
      };
    }, [clamped, size]);

  const viewBox = `0 0 ${size} ${size / 2 + 30}`;

  // Min/max label positions
  const highLabelX = cx - r;
  const lowLabelX = cx + r;
  const labelY = cy + 14;

  return (
    <div className={V2_DARK_SCOPE} style={{ ...V2_CARD, padding: 16 }}>
      {/* Header */}
      <div style={{ ...V2_TITLE, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>{label} {sourceBadge}</div>

      {/* Gauge — SVG scales to container via viewBox + 100% width */}
      <div style={{ display: "flex", justifyContent: "center", maxWidth: size, margin: "0 auto" }}>
        <svg
          width="100%"
          height="auto"
          viewBox={viewBox}
          xmlns="http://www.w3.org/2000/svg"
          style={{ maxWidth: size, aspectRatio: `${size} / ${size / 2 + 30}` }}
        >
          {/* Background track */}
          <path
            d={trackD}
            fill="none"
            stroke="var(--color-border-subtle)"
            strokeWidth={12}
            strokeLinecap="round"
          />

          {/* Colored arc */}
          {arcD && (
            <path
              d={arcD}
              fill="none"
              stroke={scoreColor}
              strokeWidth={12}
              strokeLinecap="round"
            />
          )}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={scoreColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Center dot — outer */}
          <circle cx={cx} cy={cy} r={5} fill={scoreColor} />
          {/* Center dot — inner */}
          <circle cx={cx} cy={cy} r={2} fill="var(--color-surface-raised)" />

          {/* Score text */}
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fontFamily="var(--font-data)"
            fill={scoreColor}
          >
            {clamped}
          </text>

          {/* Score label */}
          <text
            x={cx}
            y={cy + 35}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-tertiary)"
          >
            {scoreLabel}
          </text>

          {/* Min/max labels */}
          <text
            x={highLabelX}
            y={labelY}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-text-tertiary)"
          >
            HIGH
          </text>
          <text
            x={lowLabelX}
            y={labelY}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-text-tertiary)"
          >
            LOW
          </text>
        </svg>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px 12px" }}>
          {breakdown.map((item) => {
            const rounded = Math.round(item.value);
            return (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 14, fontWeight: 600,
                  minWidth: 28, textAlign: "right",
                  color: rounded >= 70 ? "hsl(152, 69%, 40%)" : rounded >= 40 ? "hsl(41, 100%, 49%)" : "hsl(0, 72%, 51%)",
                }}>{rounded}</span>
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-data)",
                  color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
