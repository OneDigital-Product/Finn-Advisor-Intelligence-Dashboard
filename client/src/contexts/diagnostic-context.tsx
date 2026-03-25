"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { DiagnosticFieldResolution } from "@/lib/diagnostic-field-resolver";

/**
 * Global Diagnostic Context
 *
 * Allows any page to push its field diagnostic data into a shared context.
 * The GlobalDiagnosticPanel reads from this context and renders the floating
 * bottom-right panel on every page.
 *
 * Usage in a page:
 *   const { setPageDiagnostics } = useDiagnosticContext();
 *   useEffect(() => {
 *     setPageDiagnostics({
 *       pageLabel: "Client Detail",
 *       fields: legacyFields,
 *       canonicalFields: resolvedFields,
 *       dataSources: { salesforce: "live", orion: "live" },
 *     });
 *     return () => clearPageDiagnostics();
 *   }, [resolvedFields]);
 */

export interface PageDiagnosticData {
  pageLabel: string;
  fields?: Array<{
    field: string;
    source: string;
    value: string | number | null | undefined;
    sfField?: string;
    orionField?: string;
    reason?: string;
    uiLocation?: string;
    suggestedAction?: string;
    apiEndpoint?: string;
    apiSource?: string;
  }>;
  canonicalFields?: DiagnosticFieldResolution[];
  dataSources?: Record<string, string>;
}

interface DiagnosticContextValue {
  pageData: PageDiagnosticData | null;
  setPageDiagnostics: (data: PageDiagnosticData) => void;
  clearPageDiagnostics: () => void;
}

const DiagnosticContext = createContext<DiagnosticContextValue>({
  pageData: null,
  setPageDiagnostics: () => {},
  clearPageDiagnostics: () => {},
});

export function DiagnosticProvider({ children }: { children: ReactNode }) {
  const [pageData, setPageData] = useState<PageDiagnosticData | null>(null);

  const setPageDiagnostics = useCallback((data: PageDiagnosticData) => {
    setPageData(data);
  }, []);

  const clearPageDiagnostics = useCallback(() => {
    setPageData(null);
  }, []);

  return (
    <DiagnosticContext.Provider value={{ pageData, setPageDiagnostics, clearPageDiagnostics }}>
      {children}
    </DiagnosticContext.Provider>
  );
}

export function useDiagnosticContext() {
  return useContext(DiagnosticContext);
}
