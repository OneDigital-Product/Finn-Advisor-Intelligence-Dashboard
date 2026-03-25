import { useDataSources } from "@/components/design/data-source-badge";

const OD = {
  medBlue: "#0078A2",
  medGreen: "#8EB935",
  orange: "#F47D20",
  lightBlue: "#4FB3CD",
  yellow: "#FFC60B",
  bgMed: "#1a1f2e",
  text1: "#FFFFFF",
  text3: "#94A3B8",
  border: "#2D3748",
};

const F = {
  headline: "'Oswald', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

interface StatsCardsRowProps {
  totalAum: number;
  totalClients: number;
  activeClients?: number;
  openTasks: number;
  revenueYTD: number;
  isLiveData: boolean;
}

function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return '$' + (value / 1e6).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'M';
  if (abs >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

const hoverColors = [OD.lightBlue, OD.medGreen, OD.yellow, OD.medGreen];

export function StatsCardsRow({ totalAum, totalClients, activeClients, openTasks, revenueYTD, isLiveData }: StatsCardsRowProps) {
  const { data: ds } = useDataSources();

  // Determine which stats are from live sources
  const aumLive = isLiveData;
  const clientsLive = isLiveData;
  const tasksLive = ds?.widgetSources?.tasks?.live ?? false;
  const revLive = isLiveData;

  const cards = [
    {
      label: "Total AUM", value: fmtCompact(totalAum),
      sub: "Orion: portfolio.totalMarketValue",
      live: aumLive,
    },
    {
      label: "Clients", value: `${totalClients} total · ${activeClients ?? totalClients} active`,
      sub: "SFDC: Account WHERE RecordType='Client'",
      live: clientsLive,
    },
    {
      label: "Open Tasks", value: openTasks.toLocaleString(),
      sub: "SFDC: Task WHERE Status != 'Completed'",
      live: tasksLive,
    },
    {
      label: "Revenue YTD (Est.)", value: fmtCompact(revenueYTD),
      sub: "SFDC: SUM(Opportunity.Amount) · THIS_YEAR",
      live: revLive,
    },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: 0, borderBottom: `1px solid ${OD.border}`,
      background: OD.bgMed,
    }}>
      {cards.map((card, i) => (
        <div
          key={card.label}
          style={{
            padding: "18px 24px",
            borderRight: i < 3 ? `1px solid ${OD.border}` : "none",
            position: "relative", cursor: "default",
            transition: "background .18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,120,162,0.05)";
            const bar = e.currentTarget.querySelector('.sc-bar') as HTMLElement;
            if (bar) bar.style.background = hoverColors[i];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            const bar = e.currentTarget.querySelector('.sc-bar') as HTMLElement;
            if (bar) bar.style.background = "transparent";
          }}
        >
          <div className="sc-bar" style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "transparent", transition: "background .2s",
          }} />

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 500, color: OD.text3,
              letterSpacing: ".04em", textTransform: "uppercase",
            }}>
              {card.label}
            </span>
            {card.live ? (
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 9, fontWeight: 600, letterSpacing: ".15em",
                color: OD.medGreen, textTransform: "uppercase",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: OD.medGreen,
                  animation: "od-pip 2s ease-in-out infinite",
                }} />
                Live Data
              </span>
            ) : (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: ".12em",
                color: OD.orange, textTransform: "uppercase",
                background: "rgba(244,125,32,0.1)",
                border: "1px solid rgba(244,125,32,0.2)",
                padding: "1px 7px", borderRadius: 3,
              }}>
                Mock Data
              </span>
            )}
          </div>
          <div style={{
            fontFamily: F.headline, fontWeight: 700, fontSize: 28,
            lineHeight: 1, letterSpacing: "-0.01em", color: OD.text1,
          }}>
            {card.value}
          </div>
          <div style={{ fontSize: 11, color: OD.text3, marginTop: 5 }}>
            {card.sub}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes od-pip { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  );
}
