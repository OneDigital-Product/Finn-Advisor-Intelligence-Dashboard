import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSignalAction } from "@/hooks/use-signal-action";
import type { DetectedSignalOutput, RecommendedAction } from "@/hooks/use-signal-scan-job";

interface SignalActionButtonProps {
  signal: DetectedSignalOutput;
  action: RecommendedAction;
  onActionComplete?: () => void;
}

export function SignalActionButton({
  signal,
  action,
  onActionComplete,
}: SignalActionButtonProps) {
  const { dispatch, isLoading } = useSignalAction({
    onSuccess: onActionComplete,
  });

  const hasId = !!signal.id;

  return (
    <Button
      size="sm"
      variant="secondary"
      className="text-[11px] h-7 px-2"
      onClick={() => hasId && dispatch(signal, action)}
      disabled={isLoading || !hasId}
      title={!hasId ? "Signals are being saved. Please wait a moment and try again." : undefined}
      data-testid={`signal-action-btn-${action.action_type}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
          {action.description}
        </>
      ) : (
        action.description
      )}
    </Button>
  );
}
