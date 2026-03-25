import { useState } from "react";

type ChartTab = "allocation" | "holdings" | "risk" | "concentration" | "gainloss";

interface ChartSwitcherProps {
  children: Partial<Record<ChartTab, React.ReactNode>>;
}

const TAB_LABELS: { id: ChartTab; label: string }[] = [
  { id: "allocation", label: "Allocation" },
  { id: "holdings", label: "Holdings" },
  { id: "gainloss", label: "Gain / Loss" },
  { id: "risk", label: "Risk" },
  { id: "concentration", label: "Concentration" },
];

export function ChartSwitcher({ children }: ChartSwitcherProps) {
  const [active, setActive] = useState<ChartTab>("allocation");

  const visibleTabs = TAB_LABELS.filter((tab) => children[tab.id] != null);

  return (
    <div style={{
      background: "#0F1219",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 0,
        padding: "0 8px",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {visibleTabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                position: "relative",
                padding: "12px 18px",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: isActive ? "#F9FAFB" : "#6B7280",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "color 0.15s ease",
                whiteSpace: "nowrap",
                borderBottom: isActive
                  ? "2px solid #3B82F6"
                  : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>{children[active]}</div>
    </div>
  );
}
