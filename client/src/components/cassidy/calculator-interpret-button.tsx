import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Sparkles } from "lucide-react";

interface CalculatorInterpretButtonProps {
  results: any;
  calculatorType: string;
  summary?: string;
}

export function CalculatorInterpretButton({ results, calculatorType, summary }: CalculatorInterpretButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleInterpret = async () => {
    setLoading(true);
    try {
      const conversationId = crypto.randomUUID();
      const promptSummary = summary || `Analyze these ${calculatorType} calculator results.`;

      await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: `Interpret these ${calculatorType} calculator results and provide planning recommendations: ${promptSummary} Full results: ${JSON.stringify(results)}`,
        conversation_id: conversationId,
        client_id: null,
        source: "calculator",
        task_type: "planning_triage",
      });
      router.push("/copilot");
    } catch {
      router.push("/copilot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleInterpret}
      disabled={loading}
      className="gap-2"
      variant="outline"
      data-testid="button-interpret-finn"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
      <Sparkles className="w-3 h-3" />
      Interpret with Finn
    </Button>
  );
}
