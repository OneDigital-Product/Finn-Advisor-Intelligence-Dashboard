import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AddTurnPayload {
  role: string;
  content: string;
  client_id?: string;
  job_id?: string;
  suggested_prompts?: string[];
  parent_turn_id?: string;
}

export function useConversation(conversationId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
  });

  const addTurn = useMutation({
    mutationFn: async (payload: AddTurnPayload) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/turns`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
    },
  });

  return {
    turns: (data as any)?.turns ?? [],
    isLoading,
    error,
    addTurn,
    refetch,
  };
}
