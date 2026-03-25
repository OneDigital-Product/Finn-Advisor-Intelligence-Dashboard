import { QuestionInput } from "./QuestionInput";

interface Question {
  id: string;
  section: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  validationRules?: Record<string, any>;
  entityTypes?: string[];
}

interface SectionFormProps {
  section: string;
  questions: Question[];
  answers: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  entityType?: string | null;
  errors?: Record<string, string>;
}

export function SectionForm({ section, questions, answers, onChange, entityType, errors = {} }: SectionFormProps) {
  const visibleQuestions = questions.filter((q) => {
    if (!q.entityTypes) return true;
    return entityType && q.entityTypes.includes(entityType);
  });

  return (
    <div className="space-y-6" data-testid={`section-form-${section}`}>
      {visibleQuestions.map((question) => (
        <div key={question.id} className="space-y-1.5">
          <label htmlFor={question.id} className="block text-sm font-medium">
            {question.label}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {question.helpText && (
            <p className="text-xs text-muted-foreground">{question.helpText}</p>
          )}
          <QuestionInput
            question={question}
            value={answers[question.id] ?? null}
            onChange={(value) => onChange(question.id, value)}
          />
          {errors[question.id] && (
            <p className="text-xs text-red-600" data-testid={`error-${question.id}`}>
              {errors[question.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
