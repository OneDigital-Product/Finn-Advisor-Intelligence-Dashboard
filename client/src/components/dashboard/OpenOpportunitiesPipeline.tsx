const OD = {
  deepBlue: "#00344F",
  medBlue: "#0078A2",
  medGreen: "#8EB935",
  orange: "#F47D20",
  yellow: "#FFC60B",
  lightBlue: "#4FB3CD",
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
  border: "#2D3748",
};

// Stage-to-color mapping for visual pipeline
const stageColors: Record<string, string> = {
  prospecting: OD.lightBlue,
  qualification: OD.medBlue,
  "needs analysis": OD.medBlue,
  "value proposition": OD.yellow,
  proposal: OD.orange,
  negotiation: OD.orange,
  "closed won": OD.medGreen,
  default: OD.text3,
};

function getStageColor(stage: string): string {
  const key = (stage || "").toLowerCase();
  return stageColors[key] || stageColors.default;
}

interface OpenOpportunity {
  id: string;
  name: string;
  stageName: string;
  amount: number;
  closeDate: string;
  probability: number;
  accountName: string;
  type: string;
  lastActivityDate: string;
  description: string;
}

interface PipelineProps {
  opportunities?: OpenOpportunity[];
  pipelineTotal?: number;
  pipelineWeighted?: number;
}

export function OpenOpportunitiesPipeline({ opportunities, pipelineTotal, pipelineWeighted }: PipelineProps) {
  const opps = opportunities || [];

  // Group by stage
  const stageGroups = opps.reduce((acc, opp) => {
    const stage = opp.stageName || "Unknown";
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(opp);
    return acc;
  }, {} as Record<string, OpenOpportunity[]>);

  const stages = Object.keys(stageGroups).sort((a, b) => {
    // Sort by average probability descending (later stages = higher probability)
    const avgA = stageGroups[a].reduce((s, o) => s + o.probability, 0) / stageGroups[a].length;
    const avgB = stageGroups[b].reduce((s, o) => s + o.probability, 0) / stageGroups[b].length;
    return avgA - avgB;
  });

  return (
    <div style={{ padding: "8px 12px" }}>
      {/* Pipeline summary bar */}
      {opps.length > 0 && (
        <div style={{
          display: "flex", gap: 16, padding: "10px 12px", marginBottom: 8,
          background: "rgba(0,120,162,0.08)", borderRadius: 6,
        }}>
          <div>
            <div style={{ fontSize: 10, color: OD.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Pipeline Total
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: OD.text1 }}>
              ${(pipelineTotal || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: OD.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Weighted Value
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: OD.medGreen }}>
              ${(pipelineWeighted || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: OD.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Open Deals
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: OD.lightBlue }}>
              {opps.length}
            </div>
          </div>
        </div>
      )}

      {/* Stage groups */}
      {opps.length === 0 ? (
        <p style={{ fontSize: 11, color: OD.text3, textAlign: "center", padding: "20px 0" }}>
          No open opportunities in pipeline
        </p>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {stages.map((stage) => {
            const stageOpps = stageGroups[stage];
            const stageTotal = stageOpps.reduce((s, o) => s + (o.amount || 0), 0);
            const color = getStageColor(stage);

            return (
              <div key={stage} style={{ marginBottom: 12 }}>
                {/* Stage header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 8px", borderRadius: 4,
                  background: "rgba(255,255,255,0.03)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: color, display: "inline-block",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: OD.text2, textTransform: "uppercase", letterSpacing: ".05em" }}>
                      {stage}
                    </span>
                    <span style={{ fontSize: 10, color: OD.text3 }}>
                      ({stageOpps.length})
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: OD.text2 }}>
                    ${stageTotal.toLocaleString()}
                  </span>
                </div>

                {/* Opportunities in stage */}
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    style={{
                      padding: "8px 12px 8px 20px",
                      borderLeft: `3px solid ${color}`,
                      marginBottom: 2,
                      marginLeft: 4,
                    }}
                    data-testid={`open-opp-${opp.id}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1, marginBottom: 2 }}>
                        {opp.name}
                      </div>
                      {opp.amount > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 600, color: OD.medGreen, whiteSpace: "nowrap", marginLeft: 8 }}>
                          ${opp.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: OD.text2, lineHeight: 1.5 }}>
                      {opp.probability > 0 && <>{opp.probability}% probability</>}
                      {opp.closeDate && <> &middot; Close {new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                      {opp.type && <> &middot; {opp.type}</>}
                    </div>
                    {opp.accountName && (
                      <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                        {opp.accountName}
                      </div>
                    )}
                    {opp.lastActivityDate && (
                      <div style={{ fontSize: 10, color: OD.text3, marginTop: 1 }}>
                        Last activity: {new Date(opp.lastActivityDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
