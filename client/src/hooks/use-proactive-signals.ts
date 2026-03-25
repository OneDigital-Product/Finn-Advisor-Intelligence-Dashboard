import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RecommendedAction {
  action_type: string;
  description: string;
}

interface ProactiveSignal {
  id: string;
  signalType: string;
  description: string;
  confidence: string;
  materiality: string;
  sourceSnippet?: string | null;
  dateReference?: string | null;
  recommendedActions?: RecommendedAction[] | null;
  status: string;
  reviewRequired?: boolean;
  duplicateLikelihood?: string | null;
  reasoning?: string | null;
  createdAt?: string;
}

const SIGNAL_TYPE_TO_SECTION: Record<string, string> = {
  retirement: "retirement",
  divorce: "estate",
  death: "estate",
  marriage: "estate",
  birth: "estate",
  beneficiary_change: "estate",
  trust_estate_change: "estate",
  business_sale: "business-succession",
  business_acquisition: "business-succession",
  liquidity_event: "portfolio",
  concentrated_stock: "portfolio",
  relocation: "overview",
  employment_change: "overview",
  insurance_need: "overview",
  legal_entity_change: "compliance",
};

export function useProactiveSignals(clientId: string | undefined) {
  const [scanTriggered, setScanTriggered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (cId: string) => {
      const res = await apiRequest("POST", `/api/cassidy/signals/client/${cId}/scan`);
      return res.json();
    },
    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/cassidy/signals/client", clientId],
        });
      }
    },
  });

  useEffect(() => {
    setScanTriggered(false);
    if (!clientId) return;

    timerRef.current = setTimeout(() => {
      setScanTriggered(true);
      scanMutation.mutate(clientId);
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [clientId]);

  const { data, isLoading } = useQuery<{ signals: ProactiveSignal[] }>({
    queryKey: ["/api/cassidy/signals/client", clientId],
    enabled: !!clientId && scanTriggered,
    staleTime: Infinity, // SSE event "signals:proactive_scan_complete" invalidates this
    gcTime: 30 * 60 * 1000,
  });

  const activeSignals = useMemo(() => {
    if (!data?.signals) return [];
    return data.signals.filter(
      (s) => s.status !== "actioned" && s.status !== "dismissed"
    );
  }, [data?.signals]);

  const signalsBySection = useMemo(() => {
    const map: Record<string, ProactiveSignal[]> = {};
    for (const signal of activeSignals) {
      const section = SIGNAL_TYPE_TO_SECTION[signal.signalType] || "insights";
      if (!map[section]) map[section] = [];
      map[section].push(signal);
    }
    return map;
  }, [activeSignals]);

  const getSignalCountForSection = useCallback((sectionId: string): number => {
    return signalsBySection[sectionId]?.length || 0;
  }, [signalsBySection]);

  const getSignalsForSection = useCallback((sectionId: string): ProactiveSignal[] => {
    return signalsBySection[sectionId] || [];
  }, [signalsBySection]);

  return {
    signals: activeSignals,
    allSignals: data?.signals || [],
    signalsBySection,
    getSignalCountForSection,
    getSignalsForSection,
    isLoading: isLoading && scanTriggered,
    isScanning: scanMutation.isPending,
    totalActiveCount: activeSignals.length,
  };
}

export type { ProactiveSignal };
export { SIGNAL_TYPE_TO_SECTION };
