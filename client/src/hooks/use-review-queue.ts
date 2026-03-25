import { useQuery } from "@tanstack/react-query";

interface ReviewQueueData {
  pendingFacts: any[];
  pendingProfiles: any[];
  pendingReports: any[];
  pendingSignals: any[];
  totalCount: number;
}

export function useReviewQueue(advisorId?: string | null) {
  const { data, isLoading } = useQuery<ReviewQueueData>({
    queryKey: ['/api/cassidy/review-queue'],
    enabled: !!advisorId,
    retry: false,
  });

  return {
    pendingFacts: data?.pendingFacts ?? [],
    pendingProfiles: data?.pendingProfiles ?? [],
    pendingReports: data?.pendingReports ?? [],
    pendingSignals: data?.pendingSignals ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
  };
}
