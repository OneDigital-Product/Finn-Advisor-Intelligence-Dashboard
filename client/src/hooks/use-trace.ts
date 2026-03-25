import { useQuery } from "@tanstack/react-query";

export function useTrace(jobId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/cassidy/jobs', jobId, 'trace'],
    enabled: !!jobId,
  });

  return {
    trace: data as any,
    isLoading,
    error,
  };
}
