"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { P } from "@/styles/tokens";

/**
 * Sticky Client Header — condenses on scroll
 *
 * Wraps the full client header + metrics bar. When the user scrolls past
 * the full header, a compact sticky bar appears with:
 * - Client initials avatar
 * - Client name
 * - Total AUM
 * - Key action buttons
 *
 * Uses IntersectionObserver for smooth swap — no scroll listeners.
 * CSS-only change, no API calls.
 */

interface StickyClientHeaderProps {
  children: ReactNode;   // The full header + metrics bar
  clientName: string;
  clientInitials: string;
  totalAum: string;
  tierLabel?: string;
  tierColor?: string;
  onEmail?: () => void;
  onSchedule?: () => void;
}

export function StickyClientHeader({
  children,
  clientName,
  clientInitials,
  totalAum,
  tierLabel,
  tierColor,
  onEmail,
  onSchedule,
}: StickyClientHeaderProps) {
  const [isCompact, setIsCompact] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompact(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel — when this scrolls out of view, switch to compact */}
      <div ref={sentinelRef} style={{ height: 0, width: "100%" }} />

      {/* Full header — always in DOM flow */}
      {children}

      {/* Compact sticky header — slides in when scrolled */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease",
          transform: isCompact ? "translateY(0)" : "translateY(-100%)",
          opacity: isCompact ? 1 : 0,
          pointerEvents: isCompact ? "auto" : "none",
          marginTop: isCompact ? 0 : -48, // collapse space when hidden
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 20px",
            background: P.odDeep,
            borderBottom: `1px solid ${P.odBorder2}`,
            borderRadius: "0 0 8px 8px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Left — Avatar + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(0,120,162,0.2)",
                border: "1px solid rgba(0,120,162,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#4FB3CD",
                fontFamily: "'Oswald', sans-serif",
                flexShrink: 0,
              }}
            >
              {clientInitials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  fontFamily: "'Oswald', sans-serif",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 260,
                }}
              >
                {clientName}
              </div>
            </div>
            {tierLabel && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: tierColor ? `${tierColor}20` : "rgba(142,185,53,0.15)",
                  color: tierColor || "#8EB935",
                  letterSpacing: "0.04em",
                }}
              >
                {tierLabel}
              </span>
            )}
          </div>

          {/* Right — AUM + Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#8EB935",
                fontFamily: "'Oswald', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              {totalAum}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {onEmail && (
                <button
                  onClick={onEmail}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: "rgba(0,120,162,0.15)",
                    color: "#4FB3CD",
                    transition: "background 100ms",
                  }}
                >
                  Email
                </button>
              )}
              {onSchedule && (
                <button
                  onClick={onSchedule}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: "rgba(142,185,53,0.15)",
                    color: "#8EB935",
                    transition: "background 100ms",
                  }}
                >
                  Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
