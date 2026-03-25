import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";

export interface AnalysisChainAgent {
  name: string;
  label: string;
}

export interface CassidyAnalysisButtonProps {
  clientId: string;
  clientName: string;
  prompt: string;
  taskType?: string;
  clientContext?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  chainAgents?: AnalysisChainAgent[];
  onJobStarted: (jobId: string) => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function CassidyAnalysisButton({
  clientId,
  clientName,
  prompt,
  taskType = "analysis",
  clientContext = {},
  metadata = {},
  chainAgents = [],
  onJobStarted,
  variant = "default",
  size = "sm",
  icon,
  label = "Run Analysis",
  className,
  disabled,
  "data-testid": testId,
}: CassidyAnalysisButtonProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: prompt,
        conversation_id: crypto.randomUUID(),
        advisor_name: "Advisor",
        client_id: clientId,
        source: "dashboard",
        task_type: taskType,
        client_context: {
          ...clientContext,
          client_name: clientName,
        },
        metadata: {
          ...metadata,
          agent_chain: chainAgents.map(a => a.name),
        },
      });

      const result = await res.json();
      onJobStarted(result.job_id);
      toast({ title: "AI analysis started" });
    } catch {
      toast({ title: "Failed to start analysis", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, clientName, prompt, taskType, clientContext, metadata, chainAgents, onJobStarted, toast]);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={disabled || isSubmitting}
      data-testid={testId}
    >
      {isSubmitting ? (
        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
      ) : (
        icon || <Brain className="w-3 h-3 mr-1.5" />
      )}
      {label}
    </Button>
  );
}
