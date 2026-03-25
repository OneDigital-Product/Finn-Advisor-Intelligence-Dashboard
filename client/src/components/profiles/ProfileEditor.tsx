import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SectionForm } from "./SectionForm";
import { StatusBadge } from "./StatusBadge";
import { FinalizationModal } from "./FinalizationModal";
import { useDebounce } from "@/hooks/useDebounce";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, CheckCircle, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileEditorProps {
  profileId: string;
  onBack: () => void;
  onViewHistory: (profileId: string) => void;
}

export function ProfileEditor({ profileId, onBack, onViewHistory }: ProfileEditorProps) {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [showFinalization, setShowFinalization] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profiles", profileId],
  });

  const { data: schemaList = [] } = useQuery<any[]>({
    queryKey: ["/api/schemas", profile?.profileType],
    queryFn: async () => {
      if (!profile?.profileType) return [];
      const res = await fetch(`/api/schemas?profileType=${profile.profileType}&active=true`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch schemas");
      return res.json();
    },
    enabled: !!profile?.profileType,
  });

  const activeSchemaId = schemaList[0]?.id;

  const { data: schema } = useQuery<any>({
    queryKey: ["/api/schemas", activeSchemaId],
    enabled: !!activeSchemaId,
  });

  const { data: draftData } = useQuery<any>({
    queryKey: ["/api/profiles", profileId, "draft"],
    enabled: !!profileId,
  });

  useEffect(() => {
    if (!initialized && draftData?.answers && Object.keys(draftData.answers).length > 0) {
      setAnswers(draftData.answers);
      setInitialized(true);
    } else if (!initialized && profile && !draftData) {
      setInitialized(true);
    }
  }, [draftData, profile, initialized]);

  const { mutate: saveDraftMutation, isPending: isSaving } = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", `/api/profiles/${profileId}/draft`, { answers: data });
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "draft"] });
    },
    onError: (err: Error) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const debouncedSave = useDebounce((data: Record<string, any>) => {
    saveDraftMutation(data);
  }, 800);

  const handleChangeAnswer = useCallback(
    (questionId: string, value: any) => {
      setAnswers((prev) => {
        const updated = { ...prev, [questionId]: value };
        setIsDirty(true);
        debouncedSave(updated);
        return updated;
      });
    },
    [debouncedSave]
  );

  const handleManualSave = useCallback(() => {
    saveDraftMutation(answers);
    toast({ title: "Draft Saved", description: "Your answers have been saved." });
  }, [answers, saveDraftMutation, toast]);

  const entityType = profile?.entityType || null;

  const questions = useMemo(() => {
    const allQuestions = Array.isArray(schema?.questions) ? schema.questions : [];
    return allQuestions.filter((q: any) => {
      if (!q.entityTypes) return true;
      return entityType && q.entityTypes.includes(entityType);
    });
  }, [schema, entityType]);

  const sections = useMemo(() => {
    return Array.from(new Set(questions.map((q: any) => q.section))) as string[];
  }, [questions]);

  const currentSectionQuestions = useMemo(() => {
    return questions.filter((q: any) => q.section === sections[currentSection]);
  }, [questions, sections, currentSection]);

  const progress = useMemo(() => {
    if (sections.length === 0) return 0;
    const completedSections = sections.filter((sec) =>
      questions
        .filter((q: any) => q.section === sec && q.required)
        .every((q: any) => {
          const val = answers[q.id];
          return val !== undefined && val !== null && val !== "";
        })
    ).length;
    return Math.round((completedSections / sections.length) * 100);
  }, [sections, questions, answers]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const q of currentSectionQuestions) {
      const val = answers[q.id];
      if (q.required && (val === undefined || val === null || val === "")) {
        errs[q.id] = "This field is required";
      }
      if (val !== undefined && val !== null && q.validationRules) {
        const rules = q.validationRules as any;
        if (rules.minLength && typeof val === "string" && val.length < rules.minLength) {
          errs[q.id] = `Must be at least ${rules.minLength} characters`;
        }
        if (rules.min !== undefined && typeof val === "number" && val < rules.min) {
          errs[q.id] = `Must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && typeof val === "number" && val > rules.max) {
          errs[q.id] = `Must be at most ${rules.max}`;
        }
      }
    }
    return errs;
  }, [currentSectionQuestions, answers]);

  if (profileLoading || !schema) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isFinalized = profile?.status === "finalized";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back-from-editor">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-editor-title">{schema.name}</h1>
            <div className="flex gap-2 mt-1">
              <StatusBadge status={profile?.status || "draft"} />
              {isDirty && (
                <Badge variant="outline" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
              {isSaving && (
                <Badge variant="outline" className="text-xs text-blue-600">
                  Saving...
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewHistory(profileId)} data-testid="button-view-history-editor">
            <History className="w-4 h-4 mr-1.5" />
            History
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-medium">Progress</span>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" data-testid="progress-bar" />
              </div>
              <div className="space-y-1">
                {sections.map((section, idx) => {
                  const sectionQuestions = questions.filter((q: any) => q.section === section);
                  const sectionCompleted = sectionQuestions
                    .filter((q: any) => q.required)
                    .every((q: any) => {
                      const val = answers[q.id];
                      return val !== undefined && val !== null && val !== "";
                    });

                  return (
                    <button
                      key={section}
                      onClick={() => setCurrentSection(idx)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        idx === currentSection
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                      data-testid={`button-section-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{section}</span>
                        {sectionCompleted && (
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 ml-1" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" data-testid="text-current-section">
                    {sections[currentSection]}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    Section {currentSection + 1} of {sections.length}
                  </span>
                </div>

                <SectionForm
                  section={sections[currentSection]}
                  questions={currentSectionQuestions}
                  answers={answers}
                  onChange={handleChangeAnswer}
                  entityType={entityType}
                  errors={isFinalized ? {} : errors}
                />

                <div className="flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
                    disabled={currentSection === 0}
                    data-testid="button-prev-section"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {!isFinalized && (
                      <>
                        <Button variant="outline" onClick={handleManualSave} disabled={isSaving} data-testid="button-save-draft">
                          <Save className="w-4 h-4 mr-1.5" />
                          Save Draft
                        </Button>
                        {currentSection === sections.length - 1 && (
                          <Button onClick={() => setShowFinalization(true)} data-testid="button-finalize-review">
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Finalize & Review
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))}
                    disabled={currentSection === sections.length - 1}
                    data-testid="button-next-section"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showFinalization && (
        <FinalizationModal
          profileId={profileId}
          answers={answers}
          schema={schema}
          onSuccess={() => {
            setShowFinalization(false);
            onViewHistory(profileId);
          }}
          onCancel={() => setShowFinalization(false)}
        />
      )}
    </div>
  );
}
