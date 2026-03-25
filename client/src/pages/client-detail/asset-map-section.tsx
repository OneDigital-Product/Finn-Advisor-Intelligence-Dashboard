import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  User,
  Users,
  Landmark,
  Building2,
  Home,
  ShieldCheck,
  Briefcase,
  Wallet,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { P, SPRING } from "@/styles/tokens";
import { Serif, Mono } from "@/components/design/typography";

interface AssetMapProps {
  client: any;
  accounts: any[];
  holdings: any[];
  alternativeAssets: any[];
  householdMembers: any[];
  totalAum: number;
  onAccountSelect: (id: string | null) => void;
}

interface MapEntity {
  id: string;
  type: "client" | "household" | "account" | "alternative" | "insurance" | "estate";
  category: "person" | "investment" | "insurance" | "real-estate" | "business" | "estate";
  label: string;
  sublabel?: string;
  value?: number;
  icon: any;
  color: string;
  bgColor: string;
  data?: any;
  children?: MapEntity[];
}

const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  person: { color: P.blue, bg: "rgba(107,143,224,.12)", border: "rgba(107,143,224,.3)" },
  investment: { color: P.grn, bg: "rgba(61,139,94,.10)", border: "rgba(61,139,94,.3)" },
  insurance: { color: P.amb, bg: "rgba(184,135,43,.10)", border: "rgba(184,135,43,.3)" },
  "real-estate": { color: "#8B6CC1", bg: "rgba(139,108,193,.10)", border: "rgba(139,108,193,.3)" },
  business: { color: "#C97B2A", bg: "rgba(201,123,42,.10)", border: "rgba(201,123,42,.3)" },
  estate: { color: "#5B8A9A", bg: "rgba(91,138,154,.10)", border: "rgba(91,138,154,.3)" },
};

function formatValue(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function safeNum(v: any, fallback = 0): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function categorizeAccount(type: string | null | undefined): { category: MapEntity["category"]; icon: any } {
  const t = safeStr(type).toLowerCase();
  if (t.includes("ira") || t.includes("401k") || t.includes("retirement") || t.includes("roth")) {
    return { category: "investment", icon: TrendingUp };
  }
  if (t.includes("trust") || t.includes("estate")) {
    return { category: "estate", icon: ShieldCheck };
  }
  if (t.includes("insurance") || t.includes("annuity") || t.includes("life")) {
    return { category: "insurance", icon: ShieldCheck };
  }
  return { category: "investment", icon: Landmark };
}

function categorizeAltAsset(type: string | null | undefined): { category: MapEntity["category"]; icon: any } {
  const t = safeStr(type).toLowerCase();
  if (t.includes("real estate") || t.includes("property") || t.includes("home") || t.includes("rental")) {
    return { category: "real-estate", icon: Home };
  }
  if (t.includes("business") || t.includes("private equity") || t.includes("venture")) {
    return { category: "business", icon: Building2 };
  }
  if (t.includes("insurance") || t.includes("life") || t.includes("annuity")) {
    return { category: "insurance", icon: ShieldCheck };
  }
  if (t.includes("trust") || t.includes("estate")) {
    return { category: "estate", icon: Briefcase };
  }
  return { category: "business", icon: Wallet };
}

function EntityNode({
  entity,
  x,
  y,
  size,
  onClick,
  isCenter,
}: {
  entity: MapEntity;
  x: number;
  y: number;
  size: number;
  onClick: () => void;
  isCenter?: boolean;
}) {
  const style = CATEGORY_STYLES[entity.category];
  const iconSize = isCenter ? size * 0.35 : size * 0.3;
  const Icon = entity.icon;

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-testid={`asset-map-entity-${entity.id}`}
    >
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={isCenter ? size * 0.15 : 8}
        fill={style.bg}
        stroke={style.border}
        strokeWidth={isCenter ? 2 : 1.5}
        className="transition-all duration-200"
      />

      <foreignObject
        x={x - iconSize / 2}
        y={y - size / 2 + (isCenter ? size * 0.12 : size * 0.1)}
        width={iconSize}
        height={iconSize}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          <Icon style={{ width: iconSize * 0.7, height: iconSize * 0.7, color: style.color }} />
        </div>
      </foreignObject>

      <text
        x={x}
        y={y + (isCenter ? size * 0.08 : size * 0.05)}
        textAnchor="middle"
        fill={P.ink}
        fontSize={isCenter ? 12 : 10}
        fontWeight={600}
        fontFamily="'DM Sans', sans-serif"
        className="dark:fill-[#E2E6EF]"
      >
        {entity.label.length > 14 ? entity.label.slice(0, 12) + "…" : entity.label}
      </text>

      {entity.sublabel && (
        <text
          x={x}
          y={y + (isCenter ? size * 0.22 : size * 0.2)}
          textAnchor="middle"
          fill={P.mid}
          fontSize={8}
          fontFamily="'DM Sans', sans-serif"
          className="dark:fill-[#8B95AA]"
        >
          {entity.sublabel.length > 18 ? entity.sublabel.slice(0, 16) + "…" : entity.sublabel}
        </text>
      )}

      {entity.value !== undefined && entity.value > 0 && (
        <text
          x={x}
          y={y + size / 2 - (isCenter ? 8 : 6)}
          textAnchor="middle"
          fill={style.color}
          fontSize={isCenter ? 13 : 11}
          fontWeight={700}
          fontFamily="'DM Mono', monospace"
        >
          {formatValue(entity.value)}
        </text>
      )}
    </g>
  );
}

function ConnectionLine({
  x1, y1, x2, y2, color, dashed,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean;
}) {
  const midY = (y1 + y2) / 2;
  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 3" : undefined}
      opacity={0.5}
    />
  );
}

function CategoryLegend({ categories }: { categories: { label: string; category: string; count: number; total: number }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "12px 0" }} data-testid="asset-map-legend">
      {categories.map((cat) => {
        const style = CATEGORY_STYLES[cat.category];
        return (
          <div
            key={cat.category}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 6,
              background: style.bg, border: `1px solid ${style.border}`,
              fontSize: 11, fontWeight: 500, color: style.color,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 2, background: style.color }} />
            {cat.label}
            <span style={{ opacity: 0.7 }}>({cat.count})</span>
            {cat.total > 0 && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                {formatValue(cat.total)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AssetMapSection({
  client,
  accounts,
  holdings,
  alternativeAssets,
  householdMembers,
  totalAum,
  onAccountSelect,
}: AssetMapProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const entities = useMemo(() => {
    const result: MapEntity[] = [];

    result.push({
      id: `client-${client.id}`,
      type: "client",
      category: "person",
      label: `${client.firstName} ${client.lastName}`,
      sublabel: client.occupation || undefined,
      value: totalAum,
      icon: User,
      color: P.blue,
      bgColor: CATEGORY_STYLES.person.bg,
      data: client,
    });

    householdMembers.forEach((m: any) => {
      result.push({
        id: `hh-${m.id}`,
        type: "household",
        category: "person",
        label: m.clientId === client.id
          ? `${client.firstName} ${client.lastName}`
          : m.relationship || "Family",
        sublabel: m.relationship,
        icon: Users,
        color: P.blue,
        bgColor: CATEGORY_STYLES.person.bg,
        data: m,
      });
    });

    accounts
      .filter((acc: any) => {
        // Only show accounts with a real value on the map
        const val = safeNum(acc.totalValue) || safeNum(acc.balance) || safeNum(acc.managedValue);
        return val > 0;
      })
      .forEach((acc: any) => {
        const { category, icon } = categorizeAccount(acc.accountType);
        const accValue = safeNum(acc.totalValue) || safeNum(acc.balance) || safeNum(acc.managedValue);
        result.push({
          id: `acc-${acc.id}`,
          type: "account",
          category,
          label: safeStr(acc.accountType, "Account"),
          sublabel: safeStr(acc.custodian),
          value: accValue,
          icon,
          color: CATEGORY_STYLES[category].color,
          bgColor: CATEGORY_STYLES[category].bg,
          data: acc,
        });
      });

    alternativeAssets.forEach((alt: any) => {
      const { category, icon } = categorizeAltAsset(alt.assetType);
      result.push({
        id: `alt-${alt.id}`,
        type: "alternative",
        category,
        label: safeStr(alt.name, "Asset"),
        sublabel: safeStr(alt.assetType),
        value: safeNum(alt.estimatedValue),
        icon,
        color: CATEGORY_STYLES[category].color,
        bgColor: CATEGORY_STYLES[category].bg,
        data: alt,
      });
    });

    return result;
  }, [client, accounts, alternativeAssets, householdMembers, totalAum]);

  const categoryGroups = useMemo(() => {
    const groups: Record<string, MapEntity[]> = {};
    entities.forEach((e) => {
      if (e.type === "client") return;
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category].push(e);
    });
    return groups;
  }, [entities]);

  const legendCategories = useMemo(() => {
    const cats: { label: string; category: string; count: number; total: number }[] = [];
    const labelMap: Record<string, string> = {
      person: "People",
      investment: "Investments",
      insurance: "Insurance",
      "real-estate": "Real Estate",
      business: "Business",
      estate: "Estate / Trust",
    };

    Object.entries(categoryGroups).forEach(([cat, items]) => {
      cats.push({
        label: labelMap[cat] || cat,
        category: cat,
        count: items.length,
        total: items.reduce((sum, e) => sum + (e.value || 0), 0),
      });
    });

    return cats;
  }, [categoryGroups]);

  const layout = useMemo(() => {
    const W = 900;
    const centerX = W / 2;
    const centerY = 200;
    const clientEntity = entities.find((e) => e.type === "client")!;

    const nonClientGroups = Object.entries(categoryGroups);
    const totalGroups = nonClientGroups.length;

    const positions: { entity: MapEntity; x: number; y: number; size: number }[] = [];

    positions.push({ entity: clientEntity, x: centerX, y: centerY, size: 100 });

    const connections: { from: { x: number; y: number }; to: { x: number; y: number }; color: string; dashed?: boolean }[] = [];

    let groupIndex = 0;
    const ringRadius = 200;
    const entitySize = 80;

    nonClientGroups.forEach(([cat, items]) => {
      const startAngle = -Math.PI / 2 + (groupIndex / totalGroups) * 2 * Math.PI;
      const groupSpread = (2 * Math.PI) / Math.max(totalGroups, 1);

      items.forEach((item, i) => {
        const angle = startAngle + (i / Math.max(items.length, 1)) * groupSpread - groupSpread * 0.3;
        const r = ringRadius + (items.length > 3 ? (i % 2) * 60 : 0);
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);

        positions.push({ entity: item, x, y, size: entitySize });

        const style = CATEGORY_STYLES[cat];
        connections.push({
          from: { x: centerX, y: centerY },
          to: { x, y },
          color: style.color,
          dashed: item.type === "household",
        });
      });

      groupIndex++;
    });

    const maxY = Math.max(...positions.map((p) => p.y + p.size / 2));
    const minY = Math.min(...positions.map((p) => p.y - p.size / 2));
    const maxX = Math.max(...positions.map((p) => p.x + p.size / 2));
    const minX = Math.min(...positions.map((p) => p.x - p.size / 2));

    const pad = 40;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = Math.max(maxX - minX + pad * 2, W);
    const vbH = Math.max(maxY - minY + pad * 2, 500);

    return { positions, connections, W: vbW, H: vbH, vbX, vbY, centerX, centerY };
  }, [entities, categoryGroups]);

  const handleEntityClick = useCallback((entity: MapEntity) => {
    setSelectedEntity(entity);
    setDetailOpen(true);
  }, []);

  const handleExportPdf = useCallback(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const safeName = escapeHtml(`${client.firstName} ${client.lastName}`);
      const safeTotal = escapeHtml(formatValue(totalAum));
      const safeDate = escapeHtml(new Date().toLocaleDateString());
      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Asset Map - ${safeName}</title>
<style>@page{size:landscape;margin:0.5in}body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'DM Sans',sans-serif}h1{font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:8px}p{color:#6B6F7A;font-size:12px;margin-top:0}img{max-width:100%;height:auto}</style>
</head><body>
<h1>Financial Asset Map</h1>
<p>${safeName} &middot; Total: ${safeTotal} &middot; Generated ${safeDate}</p>
<img src="${url}" />
<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
</body></html>`);
      printWindow.document.close();
    }
  }, [client, totalAum]);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const resetZoom = () => setZoom(1);

  const renderDetailContent = () => {
    if (!selectedEntity) return null;
    const e = selectedEntity;

    if (e.type === "account" && e.data) {
      const acc = e.data;
      const accHoldings = holdings.filter((h: any) => h.accountId === acc.id);
      const totalMV = accHoldings.reduce((s: number, h: any) => s + safeNum(h.marketValue), 0);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Account Type" value={acc.accountType} />
            <DetailField label="Account #" value={acc.accountNumber} />
            <DetailField label="Custodian" value={acc.custodian} />
            <DetailField label="Model" value={acc.model || "—"} />
            <DetailField label="Balance" value={formatValue(safeNum(acc.totalValue) || safeNum(acc.balance) || safeNum(acc.managedValue))} highlight />
            <DetailField label="Tax Status" value={acc.taxStatus || "—"} />
          </div>
          {accHoldings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Holdings ({accHoldings.length})
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Ticker</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Value</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accHoldings.slice(0, 10).map((h: any) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{h.ticker}</td>
                        <td className="p-2 text-right">{formatValue(safeNum(h.marketValue))}</td>
                        <td className="p-2 text-right text-muted-foreground">{h.weight ? `${safeNum(h.weight).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setDetailOpen(false);
              onAccountSelect(acc.id);
            }}
            data-testid="button-view-full-account"
          >
            View Full Account Details
          </Button>
        </div>
      );
    }

    if (e.type === "alternative" && e.data) {
      const alt = e.data;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Asset Type" value={alt.assetType} />
            <DetailField label="Name" value={alt.name} />
            <DetailField label="Est. Value" value={formatValue(safeNum(alt.estimatedValue))} highlight />
            <DetailField label="Cost Basis" value={alt.costBasis ? formatValue(safeNum(alt.costBasis)) : "—"} />
            <DetailField label="Location" value={alt.location || "—"} />
            <DetailField label="Acquired" value={alt.acquisitionDate || "—"} />
          </div>
          {alt.description && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Description</div>
              <p className="text-sm text-muted-foreground">{alt.description}</p>
            </div>
          )}
          {alt.notes && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Notes</div>
              <p className="text-sm text-muted-foreground">{alt.notes}</p>
            </div>
          )}
        </div>
      );
    }

    if (e.type === "client" && e.data) {
      const c = e.data;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Name" value={`${c.firstName} ${c.lastName}`} />
            {c.email && <DetailField label="Email" value={c.email} />}
            {c.phone && <DetailField label="Phone" value={c.phone} />}
            {c.occupation && <DetailField label="Occupation" value={c.occupation} />}
            {c.employer && <DetailField label="Employer" value={c.employer} />}
            <DetailField label="Total AUM" value={formatValue(totalAum)} highlight />
          </div>
        </div>
      );
    }

    if (e.type === "household" && e.data) {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Relationship" value={e.data.relationship || "—"} />
          </div>
        </div>
      );
    }

    return null;
  };

  const totalNetWorth = useMemo(() => {
    const accTotal = accounts.reduce((s, a) => s + (safeNum(a.totalValue) || safeNum(a.balance) || safeNum(a.managedValue)), 0);
    const altTotal = alternativeAssets.reduce((s, a) => s + safeNum(a.estimatedValue), 0);
    return accTotal + altTotal;
  }, [accounts, alternativeAssets]);

  const hasData = accounts.length > 0 || alternativeAssets.length > 0 || householdMembers.length > 0;

  return (
    <div className="space-y-4 animate-slide-up" data-testid="asset-map-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Serif style={{ fontSize: 22, fontWeight: 600 }} data-testid="text-asset-map-title">
            Financial Asset Map
          </Serif>
          <p className="text-sm text-muted-foreground mt-1">
            Complete visual overview of {client.firstName}'s financial household
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="outline" size="sm" onClick={zoomOut} data-testid="button-zoom-out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetZoom} data-testid="button-zoom-reset">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={zoomIn} data-testid="button-zoom-in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} data-testid="button-export-pdf">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Net Worth" value={formatValue(totalNetWorth)} color={P.grn} icon={DollarSign} />
        <SummaryCard label="Accounts" value={String(accounts.length)} color={P.blue} icon={Landmark} />
        <SummaryCard label="Alt. Assets" value={String(alternativeAssets.length)} color="#8B6CC1" icon={Building2} />
        <SummaryCard label="Household" value={String(Math.max(householdMembers.length, 1))} color={P.amb} icon={Users} />
      </div>

      <CategoryLegend categories={legendCategories} />

      {!hasData ? (
        <div
          style={{
            padding: 48, textAlign: "center", borderRadius: 8,
            border: "1px dashed rgba(0,0,0,.15)", background: "rgba(0,0,0,.02)",
          }}
        >
          <Users style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px" }} />
          <p className="text-sm text-muted-foreground">No financial data available to map.</p>
          <p className="text-xs text-muted-foreground mt-1">Add accounts or assets to generate the visual map.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            borderRadius: 8, border: "1px solid rgba(0,0,0,.08)",
            overflow: "auto", background: "rgba(0,0,0,.015)",
            maxHeight: 600,
          }}
          className="dark:border-white/10 dark:bg-white/[.02]"
          data-testid="asset-map-canvas"
        >
          <svg
            ref={svgRef}
            viewBox={`${layout.vbX} ${layout.vbY} ${layout.W} ${layout.H}`}
            width={layout.W * zoom}
            height={layout.H * zoom}
            style={{ display: "block", margin: "0 auto" }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {layout.connections.map((conn, i) => (
              <ConnectionLine
                key={i}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                color={conn.color}
                dashed={conn.dashed}
              />
            ))}

            {layout.positions.map((pos) => (
              <EntityNode
                key={pos.entity.id}
                entity={pos.entity}
                x={pos.x}
                y={pos.y}
                size={pos.size}
                isCenter={pos.entity.type === "client"}
                onClick={() => handleEntityClick(pos.entity)}
              />
            ))}
          </svg>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-entity-detail-title">
              {selectedEntity && (() => {
                const Icon = selectedEntity.icon;
                const style = CATEGORY_STYLES[selectedEntity.category];
                return (
                  <>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: style.bg, border: `1px solid ${style.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 14, height: 14, color: style.color }} />
                    </div>
                    {selectedEntity.label}
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {selectedEntity.category}
                    </Badge>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {renderDetailContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <div
      style={{
        padding: "12px 14px", borderRadius: 8,
        background: `${color}08`, border: `1px solid ${color}20`,
      }}
      className="dark:bg-white/[.03] dark:border-white/10"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Icon style={{ width: 13, height: 13, color }} />
        <span style={{ fontSize: 10, color: P.mid, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}
          className="dark:text-[#8B95AA]"
        >
          {label}
        </span>
      </div>
      <Mono style={{ fontSize: 18, fontWeight: 700, color }} data-testid={`text-summary-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </Mono>
    </div>
  );
}

function DetailField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,.03)" }} className="dark:bg-white/[.04]">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{label}</div>
      <div className={`text-sm ${highlight ? "font-semibold" : "font-medium"}`}>{value}</div>
    </div>
  );
}
