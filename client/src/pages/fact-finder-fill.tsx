import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { evaluateCondition } from "./fact-finder-utils";

export default function FactFinderFill({ params: propParams }: { params?: { id?: string } } = {}) {
  const routerParams = useParams<{ id: string }>();
  const { id } = propParams?.id ? propParams as { id: string } : routerParams;
  const router = useRouter();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);
  const autoSaveTimer = useRef<any>(null);

  const { data: response, isLoading: responseLoading } = useQuery<any>({
    queryKey: ["/api/fact-finder-responses", id],
  });

  const { data: definition, isLoading: defLoading } = useQuery<any>({
    queryKey: ["/api/fact-finders", response?.definitionId],
    enabled: !!response?.definitionId,
  });

  useEffect(() => {
    if (response && !loaded) {
      setAnswers(response.answers || {});
      setLoaded(true);
    }
  }, [response, loaded]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/fact-finder-responses/${id}`, { answers: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fact-finder-responses", id] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/fact-finder-responses/${id}/submit`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fact-finder-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fact-finder-responses", id] });
      toast({ title: "Fact finder submitted successfully" });
      router.push("/fact-finders");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAnswer = useCallback(
    (questionId: string, value: any) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
          saveMutation.mutate(next);
        }, 2000);
        return next;
      });
    },
    [saveMutation]
  );

  const handleSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    saveMutation.mutate(answers);
    toast({ title: "Progress saved" });
  };

  if (responseLoading || defLoading || !loaded) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!definition || !response) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Fact finder not found</p>
        <Button variant="link" onClick={() => router.push("/fact-finders")} className="mt-2">Back to Fact Finders</Button>
      </div>
    );
  }

  const isReadOnly = response.status !== "draft";
  const questionSchema = (definition.questionSchema || []) as any[];
  const allSections = [...new Set(questionSchema.map((q: any) => q.section))];

  const currentQuestions = questionSchema.filter(
    (q: any) => q.section === allSections[currentSection]
  ).filter((q: any) => {
    if (!q.conditionalOn) return true;
    return evaluateCondition(q.conditionalOn, answers);
  });

  const visibleRequired = questionSchema
    .filter((q: any) => {
      if (!q.conditionalOn) return true;
      return evaluateCondition(q.conditionalOn, answers);
    })
    .filter((q: any) => q.required);
  const answeredRequired = visibleRequired.filter(
    (q: any) => answers[q.id] !== undefined && answers[q.id] !== ""
  );
  const completion = visibleRequired.length > 0
    ? Math.round((answeredRequired.length / visibleRequired.length) * 100)
    : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/fact-finders")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-ff-title">{definition.name}</h1>
          <p className="text-xs text-muted-foreground">{definition.description}</p>
        </div>
        {isReadOnly && (
          <Badge className="bg-blue-600 no-default-active-elevate">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {response.status}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Overall progress</span>
          <span>{completion}% ({answeredRequired.length}/{visibleRequired.length} required)</span>
        </div>
        <Progress value={completion} className="h-2" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {allSections.map((section, i) => (
          <Button
            key={section}
            size="sm"
            variant={i === currentSection ? "default" : "outline"}
            className="text-xs whitespace-nowrap"
            onClick={() => setCurrentSection(i)}
            data-testid={`button-section-${i}`}
          >
            {i + 1}. {section}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {allSections[currentSection]}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Section {currentSection + 1} of {allSections.length} · {currentQuestions.length} question{currentQuestions.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentQuestions.map((q: any) => (
            <div key={q.id} className="space-y-1.5" data-testid={`question-${q.id}`}>
              <Label htmlFor={q.id} className={q.required ? "font-medium" : ""}>
                {q.label}
                {q.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {q.helpText && (
                <p className="text-xs text-muted-foreground">{q.helpText}</p>
              )}

              {q.type === "text" && (
                <Input
                  id={q.id}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder || q.label}
                  disabled={isReadOnly}
                  data-testid={`input-${q.id}`}
                />
              )}

              {q.type === "textarea" && (
                <Textarea
                  id={q.id}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder || q.label}
                  disabled={isReadOnly}
                  rows={3}
                  data-testid={`textarea-${q.id}`}
                />
              )}

              {q.type === "number" && (
                <Input
                  id={q.id}
                  type="number"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value ? Number(e.target.value) : "")}
                  disabled={isReadOnly}
                  data-testid={`input-${q.id}`}
                />
              )}

              {q.type === "currency" && (
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                  <Input
                    id={q.id}
                    type="number"
                    className="pl-7"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleAnswer(q.id, e.target.value ? Number(e.target.value) : "")}
                    disabled={isReadOnly}
                    data-testid={`input-${q.id}`}
                  />
                </div>
              )}

              {q.type === "select" && (
                <select
                  id={q.id}
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  disabled={isReadOnly}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  data-testid={`select-${q.id}`}
                >
                  <option value="">Select...</option>
                  {q.options?.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {q.type === "boolean" && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === true}
                      onChange={() => handleAnswer(q.id, true)}
                      disabled={isReadOnly}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === false}
                      onChange={() => handleAnswer(q.id, false)}
                      disabled={isReadOnly}
                    />
                    No
                  </label>
                </div>
              )}

              {q.type === "multiselect" && (
                <div className="flex flex-wrap gap-2">
                  {q.options?.map((opt: string) => {
                    const selected = (answers[q.id] || []).includes(opt);
                    return (
                      <Badge
                        key={opt}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer no-default-active-elevate"
                        onClick={() => {
                          if (isReadOnly) return;
                          const current = answers[q.id] || [];
                          const next = selected
                            ? current.filter((v: string) => v !== opt)
                            : [...current, opt];
                          handleAnswer(q.id, next);
                        }}
                        data-testid={`option-${q.id}-${opt}`}
                      >
                        {opt}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          data-testid="button-prev"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-3.5 h-3.5 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          )}

          {currentSection < allSections.length - 1 ? (
            <Button
              onClick={() => setCurrentSection(currentSection + 1)}
              data-testid="button-next"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : !isReadOnly ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || completion < 100}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-submit"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          ) : null}
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Auto-saves after 2 seconds of inactivity</span>
          {saveMutation.isPending && <span>· Saving...</span>}
        </div>
      )}
    </div>
  );
}
