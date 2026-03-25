import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { P } from "@/styles/tokens";
import { Lbl } from "@/components/design/typography";
import { TS } from "@/components/design/typography";
import { Spark } from "@/components/design";
import { formatCurrency } from "@/lib/format";
import { DataSourceBadge } from "@/components/design/data-source-badge";

interface ClientStats {
  totalAum: number;
  netFlowsYTD: number;
  revenueYTD: number;
  clientCount: number;
  activeClientCount: number;
  isDemoData: boolean;
  openTasks: number;
  openCases: number;
}

type SourceType = "portfolio" | "meetings" | "alerts" | "insights" | "actions" | "goals" | "tasks" | "calcs" | "fin" | "scheduling" | "household";

export function BookSnapshotCards() {
  const { data, isLoading } = useQuery<ClientStats>({
    queryKey: ["/api/clients/stats"],
    staleTime: 5 * 60 * 1000, // 5 min — server enriched-clients cache is 3 min; slight buffer avoids pointless refetch
    refetchInterval: 5 * 60 * 1000, // Poll every 5 min — aligns with server cache TTL
    refetchIntervalInBackground: false, // Stop polling when tab is hidden
  });

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" style={{ borderRadius: 6 }} />)}
      </div>
    );
  }

  const isLive = !data?.isDemoData;
  const netFlowsAvailable = (data?.netFlowsYTD || 0) !== 0 || data?.isDemoData;
  const revenueYTD = data?.revenueYTD || 0;
  const revenueIsEstimate = isLive && revenueYTD > 0;
  // When data comes from live SF/Orion, use "household" source (registered as live)
  const sfSource: SourceType = isLive ? "household" : "tasks";

  // Generate sparkline trend data normalized to same scale as the actual value
  function sparkTrend(actual: number, steps = 6): number[] {
    if (actual === 0) return [0, 0, 0, 0, 0, 0, 0];
    const base = actual * 0.85;
    const step = (actual - base) / steps;
    return Array.from({ length: steps }, (_, i) => base + step * i).concat(actual);
  }

  const metricCards: Array<{ l: string; v: string; d: number[]; c: string; src: SourceType }> = [
    { l: "Total AUM", v: formatCurrency(data?.totalAum || 0), d: sparkTrend(data?.totalAum || 0), c: P.blue, src: "portfolio" },
    { l: "Clients", v: `${data?.clientCount || 0} total · ${data?.activeClientCount || 0} active`, d: sparkTrend(data?.clientCount || 0), c: P.grn, src: isLive ? "household" : "portfolio" },
  ];

  // Only show Net Flows if the value is non-zero or it's sample data
  if (netFlowsAvailable) {
    metricCards.push({ l: `Net Flows YTD${data?.isDemoData ? " (sample)" : ""}`, v: formatCurrency(data?.netFlowsYTD || 0), d: sparkTrend(data?.netFlowsYTD || 0), c: P.grn, src: "portfolio" });
  } else {
    // Replace with Open Tasks card — data comes from SF when live
    metricCards.push({ l: "Open Tasks", v: `${data?.openTasks || 0}`, d: sparkTrend(data?.openTasks || 0), c: P.amb, src: sfSource });
  }

  // Show Revenue if available; add estimate label for live data
  if (revenueYTD > 0 || data?.isDemoData) {
    metricCards.push({ l: `Revenue YTD${data?.isDemoData ? " (sample)" : revenueIsEstimate ? " (est.)" : ""}`, v: formatCurrency(revenueYTD), d: sparkTrend(revenueYTD), c: P.amb, src: "portfolio" });
  } else {
    // Replace with Open Cases card — data comes from SF when live
    metricCards.push({ l: "Open Cases", v: `${data?.openCases || 0}`, d: sparkTrend(data?.openCases || 0), c: P.red, src: sfSource });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {metricCards.map((m, i) => (
        <div
          key={i}
          className="animate-fu hv-glow"
          style={{
            padding: "16px 20px",
            borderRadius: 6,
            background: P.cream,
            border: `1px solid ${P.creamMd}`,
            animationDelay: `${i * 50}ms`,
            cursor: "default",
            position: "relative",
          }}
          data-testid={`metric-${m.l.toLowerCase().replace(/\s/g, "-")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lbl>{m.l}</Lbl>
              <DataSourceBadge source={m.src} compact />
            </div>
            <Spark data={m.d} w={56} h={16} c={m.c} />
          </div>
          <span style={{ fontSize: TS.title, fontWeight: 700, color: P.ink, fontFamily: "'DM Sans', sans-serif" }}>{m.v}</span>
        </div>
      ))}
    </div>
  );
}
