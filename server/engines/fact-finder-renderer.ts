import { FactFinderDefinition } from "@shared/schema";

export interface RenderedQuestion {
  id: string;
  section: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  visible: boolean;
  helpText?: string;
  currentValue?: any;
}

export interface RenderedFactFinder {
  definition: FactFinderDefinition;
  sections: string[];
  questions: RenderedQuestion[];
  completionPercentage: number;
  visibleRequiredCount: number;
  answeredCount: number;
}

export function renderFactFinder(
  definition: FactFinderDefinition,
  currentAnswers: Record<string, any> = {}
): RenderedFactFinder {
  const questionSchema = (definition.questionSchema || []) as any[];

  const visibleQuestions = questionSchema.filter((q) => {
    if (!q.conditionalOn) return true;
    return evaluateCondition(q.conditionalOn, currentAnswers);
  });

  const questions: RenderedQuestion[] = visibleQuestions.map((q) => ({
    id: q.id,
    section: q.section,
    label: q.label,
    type: q.type,
    options: q.options,
    required: q.required || false,
    visible: true,
    helpText: q.helpText,
    currentValue: currentAnswers[q.id],
  }));

  const sections = [...new Set(questions.map((q) => q.section))];

  const visibleRequiredCount = questions.filter((q) => q.required).length;
  const answeredCount = questions.filter(
    (q) => q.required && currentAnswers[q.id] !== undefined && currentAnswers[q.id] !== ""
  ).length;
  const completionPercentage =
    visibleRequiredCount > 0
      ? Math.round((answeredCount / visibleRequiredCount) * 100)
      : 0;

  return {
    definition,
    sections,
    questions,
    completionPercentage,
    visibleRequiredCount,
    answeredCount,
  };
}

export function evaluateCondition(
  condition: string,
  answers: Record<string, any>
): boolean {
  try {
    const parts = condition.split(/\s*(===|!==|==|!=|>=|<=|>|<)\s*/);
    if (parts.length === 3) {
      const [field, op, rawVal] = parts;
      const actual = answers[field];
      let expected: any = rawVal.replace(/['"]/g, "");
      if (expected === "true") expected = true;
      else if (expected === "false") expected = false;
      else if (!isNaN(Number(expected))) expected = Number(expected);

      switch (op) {
        case "===":
        case "==":
          return actual == expected;
        case "!==":
        case "!=":
          return actual != expected;
        case ">":
          return Number(actual) > Number(expected);
        case "<":
          return Number(actual) < Number(expected);
        case ">=":
          return Number(actual) >= Number(expected);
        case "<=":
          return Number(actual) <= Number(expected);
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function calculateCompletionPercentage(
  definition: FactFinderDefinition,
  answers: Record<string, any>
): number {
  const rendered = renderFactFinder(definition, answers);
  return rendered.completionPercentage;
}
