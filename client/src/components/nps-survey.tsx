import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, X } from "lucide-react";

const SURVEY_COOLDOWN_KEY = "nps_survey_last_shown";
const SURVEY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SURVEY_ACTION_COUNT_KEY = "nps_survey_action_count";
const ACTIONS_BEFORE_SHOW = 5;

export function NpsSurvey() {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const checkShouldShow = useCallback(() => {
    const lastShown = localStorage.getItem(SURVEY_COOLDOWN_KEY);
    if (lastShown && Date.now() - parseInt(lastShown) < SURVEY_COOLDOWN_MS) {
      return false;
    }
    const actionCount = parseInt(localStorage.getItem(SURVEY_ACTION_COUNT_KEY) || "0");
    return actionCount >= ACTIONS_BEFORE_SHOW;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (checkShouldShow() && !visible && !submitted) {
        setVisible(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [checkShouldShow, visible, submitted]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/survey", {
        rating,
        comment: comment || undefined,
        pageUrl: window.location.pathname,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      localStorage.setItem(SURVEY_COOLDOWN_KEY, Date.now().toString());
      localStorage.setItem(SURVEY_ACTION_COUNT_KEY, "0");
      setTimeout(() => {
        setVisible(false);
        setSubmitted(false);
        setRating(0);
        setComment("");
      }, 2000);
    },
  });

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(SURVEY_COOLDOWN_KEY, Date.now().toString());
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300" data-testid="nps-survey">
      <Card className="w-80 shadow-lg border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Quick Feedback</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss} data-testid="button-dismiss-survey">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {submitted ? (
            <p className="text-center text-sm text-green-600 py-4" data-testid="text-survey-thanks">
              Thank you for your feedback!
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                How would you rate your experience with Advisor Suite?
              </p>
              <div className="flex gap-1 justify-center" data-testid="survey-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                    data-testid={`button-star-${star}`}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoveredRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Textarea
                    placeholder="Tell us more (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="text-sm resize-none h-16"
                    data-testid="input-survey-comment"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-survey"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function trackSurveyAction() {
  const count = parseInt(localStorage.getItem(SURVEY_ACTION_COUNT_KEY) || "0");
  localStorage.setItem(SURVEY_ACTION_COUNT_KEY, (count + 1).toString());
}
