const C = {
  tabActive: "#0078A2",
  lightBlue: "#4FB3CD",
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  orange: "#F47D20",
  green: "#8EB935",
  badge: "#0078A2",
};

interface Tab {
  label: string;
  badge?: number;
  badgeColor?: "orange" | "green" | "blue";
}

interface PageTabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (label: string) => void;
}

const badgeBg: Record<string, string> = {
  orange: C.orange,
  green: C.green,
  blue: C.badge,
};

export function PageTabs({ tabs, activeTab, onTabChange }: PageTabsProps) {
  const active = activeTab || tabs[0]?.label || "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {tabs.map((tab) => {
        const isActive = active === tab.label;
        return (
          <div
            key={tab.label}
            onClick={() => onTabChange?.(tab.label)}
            style={{
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? C.lightBlue : C.textMuted,
              padding: "6px 10px",
              cursor: "pointer",
              borderBottom: `2px solid ${isActive ? C.tabActive : "transparent"}`,
              transition: "all .15s",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
              lineHeight: 1,
            }}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 10,
                lineHeight: 1.4,
                background: badgeBg[tab.badgeColor || "blue"],
                color: C.text,
              }}>
                {tab.badge}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
