import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send } from "lucide-react";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feedback", {
        type,
        message,
        pageUrl: window.location.pathname,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thanks for your feedback!", description: "Your input helps us improve." });
      setOpen(false);
      setMessage("");
      setType("feedback");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:shadow-xl transition-shadow group"
        data-testid="button-open-feedback"
        title="Send Feedback"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="feedback-widget-modal">
      <Card className="w-80 shadow-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Send Feedback</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-close-feedback"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="select-feedback-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feedback">General Feedback</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              maxLength={500}
              className="min-h-24 resize-none"
              data-testid="input-feedback-message"
            />
            <p className="text-xs text-muted-foreground text-right" data-testid="text-char-count">
              {message.length}/500
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={message.length < 10 || submitMutation.isPending}
            data-testid="button-submit-feedback"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? "Sending..." : "Submit Feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
