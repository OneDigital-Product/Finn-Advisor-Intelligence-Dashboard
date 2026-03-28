import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Target, BarChart3, Grid3X3, Brain, AlertTriangle } from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface ConcentrationViewProps {
  clientId: string;
}

const FLAG_COLORS: Record<string, string> = {
  red: "bg-red-100 text-red-800 border-red-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  normal: "bg-gray-50 text-gray-700 border-gray-200",
};

export function ConcentrationView({ clientId }: ConcentrationViewProps) {
  const [data, setData] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/concentration-analysis`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Analysis failed");
      return res.json();
    },
    onSuccess: setData,
  });

  if (!data && !mutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="w-10 h-10 text-muted-foreground/40 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          Analyze fund overlap, security concentration, and sector exposure.
        </p>
        <Button onClick={() => mutation.mutate()} size="sm">
          <Target className="w-3.5 h-3.5 mr-1.5" /> Run Concentration Analysis
        </Button>
      </div>
    );
  }

  if (mutation.isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Computing overlap matrix and AI interpretation...</span>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Top Holdings Table */}
      {(data.concentrationData || []).length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={V2_TITLE}>
              <BarChart3 className="w-4 h-4" />
              Top Holdings by Concentration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 pr-3">Security</th>
                    <th className="text-right py-2 pr-3">Weight %</th>
                    <th className="text-center py-2 pr-3">Funds</th>
                    <th className="text-right py-2 pr-3">Value</th>
                    <th className="text-center py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.concentrationData.map((c: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-mono font-semibold">{c.ticker}</span>
                        <span className="text-gray-400 ml-2 text-[10px]">{c.name}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono font-medium">
                        {c.weight.toFixed(1)}%
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <Badge variant="outline" className="text-[10px]">{c.fundCount}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">
                        ${c.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 text-center">
                        <Badge variant="outline" className={`text-[10px] ${FLAG_COLORS[c.flag] || ""}`}>
                          {c.flag === "red" ? ">15%" : c.flag === "yellow" ? ">10%" : "OK"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Concentration */}
      {(data.sectorConcentration || []).length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={V2_TITLE}>
              <BarChart3 className="w-4 h-4" />
              Sector Concentration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.sectorConcentration.slice(0, 11).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 truncate">{s.sector}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${s.flag === "amber" ? "bg-amber-400" : "bg-blue-400"}`}
                      style={{ width: `${Math.min(s.weight, 100)}%` }}
                    />
                    {s.weight > 25 && (
                      <div className="absolute right-1 top-0 h-full flex items-center">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{s.weight.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fund Overlap Heatmap */}
      {(data.overlapMatrix || []).length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={V2_TITLE}>
              <Grid3X3 className="w-4 h-4" />
              Fund Overlap Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 pr-3">Account 1</th>
                    <th className="text-left py-2 pr-3">Account 2</th>
                    <th className="text-right py-2 pr-3">Overlap %</th>
                    <th className="text-center py-2">Shared</th>
                    <th className="text-center py-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overlapMatrix
                    .sort((a: any, b: any) => b.overlapPct - a.overlapPct)
                    .map((row: any, i: number) => {
                      const intensity = Math.min(row.overlapPct / 100, 1);
                      const bg = `rgba(239, 68, 68, ${intensity * 0.15})`;
                      return (
                        <tr key={i} className="border-b last:border-0" style={{ background: bg }}>
                          <td className="py-2 pr-3 font-medium">{row.account1}</td>
                          <td className="py-2 pr-3 font-medium">{row.account2}</td>
                          <td className="py-2 pr-3 text-right font-mono font-semibold">
                            {row.overlapPct}%
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className="text-[10px]">{row.sharedCount}</Badge>
                          </td>
                          <td className="py-2 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                row.overlapPct > 60 ? "bg-red-100 text-red-700" :
                                row.overlapPct > 30 ? "bg-amber-100 text-amber-700" :
                                "bg-green-100 text-green-700"
                              }`}
                            >
                              {row.overlapPct > 60 ? "High" : row.overlapPct > 30 ? "Moderate" : "Low"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Interpretation */}
      {data.aiAnalysis && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2" style={V2_TITLE}>
              <Brain className="w-4 h-4" />
              AI Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {data.aiAnalysis.advisorNarrative || data.aiAnalysis.clientSummary || "No AI interpretation available."}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Re-run button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Target className="w-3 h-3 mr-1" />}
          Re-run Analysis
        </Button>
      </div>
    </div>
  );
}
