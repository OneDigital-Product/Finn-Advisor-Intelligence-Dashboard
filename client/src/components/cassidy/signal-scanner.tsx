import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Radar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SignalScannerProps {
  meetingId: string;
  clientId: string;
  hasContent: boolean;
  onScanStarted: (jobId: string) => void;
  isScanning: boolean;
}

export function SignalScanner({
  meetingId,
  clientId,
  hasContent,
  onScanStarted,
  isScanning,
}: SignalScannerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!hasContent) {
      toast({
        title: "Unable to scan",
        description: "Meeting must have a transcript or summary to scan for signals",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/cassidy/scan-signals", {
        meetingId,
        clientId,
      });
      const data = await response.json();
      onScanStarted(data.job_id);
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err.message || "Failed to start signal scan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isScanning;

  return (
    <Button
      onClick={handleScan}
      disabled={!hasContent || busy}
      variant="outline"
      size="sm"
      data-testid="button-scan-signals"
    >
      {busy ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Scanning...
        </>
      ) : (
        <>
          <Radar className="w-3.5 h-3.5 mr-1.5" />
          Scan for Signals
        </>
      )}
    </Button>
  );
}
