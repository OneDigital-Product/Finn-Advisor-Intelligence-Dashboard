import { useQuery } from "@tanstack/react-query";

/**
 * Shared hook for fetching the full client list (unpaginated).
 *
 * Used by calculator pages, reports, automations, and other views that need
 * a complete client dropdown. Shares a single React Query cache entry across
 * all consumers, with a 10-minute staleTime matching the server-side
 * ENRICHED_CLIENTS_TTL so we never re-fetch when the server would return
 * the same cached response.
 *
 * Query key: ["/api/clients"] — same key all calculator pages already use,
 * but now with an explicit staleTime to prevent unnecessary refetches.
 */
export const ALL_CLIENTS_QUERY_KEY = ["/api/clients"] as const;
export const ALL_CLIENTS_STALE_TIME = 10 * 60 * 1000; // 10 min — matches server cache

export function useAllClients() {
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ALL_CLIENTS_QUERY_KEY,
    staleTime: ALL_CLIENTS_STALE_TIME,
  });

  const clients = Array.isArray(data) ? data : (data?.clients || []);

  return { clients, data, isLoading, error };
}
