import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SignalActionOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useSignalAction(options?: SignalActionOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const dispatch = async (signal: any, action: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", `/api/cassidy/signals/${signal.id}/action`, {
        action_type: action.action_type,
      });

      const result = await response.json();

      toast({
        title: "Action initiated",
        description: result.message || "Action completed successfully",
      });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("/api/cassidy/signals");
        },
      });

      if (result.navigation) {
        setTimeout(() => {
          router.push(result.navigation);
        }, 500);
      }

      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Action failed";
      setError(errorMsg);
      toast({
        title: "Action failed",
        description: errorMsg,
        variant: "destructive",
      });
      options?.onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return { dispatch, isLoading, error };
}
