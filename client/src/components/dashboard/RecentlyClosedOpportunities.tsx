const OD = {
  medGreen: "#8EB935",
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
};

interface ClosedOpportunity {
  id: string;
  name: string;
  stageName: string;
  accountName: string;
  amount: number;
  closeDate: string;
}

export function RecentlyClosedOpportunities({ opportunities }: { opportunities?: ClosedOpportunity[] }) {
  const opps = opportunities || [];

  return (
    <div style={{ padding: "8px 12px", maxHeight: 300, overflowY: "auto" }}>
      {opps.length === 0 ? (
        <p style={{ fontSize: 11, color: OD.text3, textAlign: "center", padding: "20px 0" }}>
          No recently closed opportunities
        </p>
      ) : (
        opps.map((opp) => (
          <div
            key={opp.id}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              marginBottom: 4,
              borderLeft: `3px solid ${OD.medGreen}`,
            }}
            data-testid={`closed-opp-${opp.id}`}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1, marginBottom: 2 }}>
              {opp.name}
            </div>
            <div style={{ fontSize: 11, color: OD.text2, lineHeight: 1.5 }}>
              {opp.stageName}
              {opp.amount > 0 && <> &middot; ${opp.amount.toLocaleString()}</>}
              {opp.closeDate && <> &middot; {new Date(opp.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
            </div>
            {opp.accountName && (
              <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                {opp.accountName}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
