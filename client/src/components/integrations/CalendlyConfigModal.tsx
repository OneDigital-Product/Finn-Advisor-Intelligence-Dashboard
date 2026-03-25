import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Calendar } from "lucide-react";

interface CalendlyConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendlyConfigModal({ open, onOpenChange }: CalendlyConfigModalProps) {
  const { toast } = useToast();
  const [token, setToken] = useState("");

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/calendly/config", { accessToken: token });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/calendly/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/calendly/event-types"] });
      toast({ title: "Calendly connected", description: `Welcome, ${data.userName}!` });
      setToken("");
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Please check your access token and try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="calendly-config-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Connect Calendly
          </DialogTitle>
          <DialogDescription>
            Enter your Calendly Personal Access Token to display your scheduling links.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="calendly-token">Access Token</Label>
            <Input
              id="calendly-token"
              type="password"
              placeholder="Enter your Calendly access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              data-testid="input-calendly-token"
            />
            <p className="text-xs text-muted-foreground">
              Get your token from{" "}
              <a
                href="https://calendly.com/integrations/api_webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
              >
                Calendly API Settings
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => connectMutation.mutate()}
            disabled={!token.trim() || connectMutation.isPending}
            data-testid="button-submit-calendly-token"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
