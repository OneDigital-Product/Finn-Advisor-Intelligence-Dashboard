"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "wm-query-cache",
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 30 * 60 * 1000,
        // Never persist failed queries — a cold-cache 404 should not be
        // replayed on the next page load. Only successful data is persisted.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.state.status === "success" && query.state.data != null;
          },
        },
      }}
    >
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary level="root">
            <AuthProvider>
              {children}
            </AuthProvider>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
