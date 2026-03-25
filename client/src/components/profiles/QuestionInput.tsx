import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface QuestionInputProps {
  question: {
    id: string;
    type: string;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
  };
  value: any;
  onChange: (value: any) => void;
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  const { type, options, placeholder } = question;

  switch (type) {
    case "text":
      return (
        <Input
          data-testid={`input-${question.id}`}
          placeholder={placeholder || ""}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "textarea":
      return (
        <Textarea
          data-testid={`input-${question.id}`}
          placeholder={placeholder || ""}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );

    case "number":
      return (
        <Input
          data-testid={`input-${question.id}`}
          type="number"
          placeholder={placeholder || ""}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        />
      );

    case "date":
      return (
        <Input
          data-testid={`input-${question.id}`}
          type="date"
          value={value ? (typeof value === "string" && value.includes("T") ? value.split("T")[0] : value) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "select":
      return (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger data-testid={`input-${question.id}`}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2" data-testid={`input-${question.id}`}>
          {options?.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${opt.value}`}
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, opt.value]);
                  } else {
                    onChange(selected.filter((v) => v !== opt.value));
                  }
                }}
              />
              <Label htmlFor={`${question.id}-${opt.value}`} className="cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "radio":
      return (
        <RadioGroup value={value || ""} onValueChange={onChange} data-testid={`input-${question.id}`}>
          {options?.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
              <Label htmlFor={`${question.id}-${opt.value}`} className="cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      return (
        <Checkbox
          data-testid={`input-${question.id}`}
          checked={value || false}
          onCheckedChange={onChange}
        />
      );

    default:
      return (
        <Input
          data-testid={`input-${question.id}`}
          placeholder={placeholder || ""}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
