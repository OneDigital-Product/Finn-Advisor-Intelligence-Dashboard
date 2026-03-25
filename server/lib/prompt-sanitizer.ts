const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/gi,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/gi,
  /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/gi,
  /override\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/gi,
  /you\s+are\s+now\s+(a|an|the)\s+/gi,
  /new\s+instructions?\s*:/gi,
  /system\s*:\s*/gi,
  /\[\s*system\s*\]/gi,
  /\[\s*INST\s*\]/gi,
  /<<\s*SYS\s*>>/gi,
  /<<\s*\/SYS\s*>>/gi,
  /\[\/INST\]/gi,
  /act\s+as\s+(a|an|if)\s+/gi,
  /pretend\s+(you\s+are|to\s+be|that)\s+/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
  /developer\s+mode\s+(enabled|on|activated)/gi,
  /do\s+anything\s+now/gi,
  /bypass\s+(safety|filter|restriction|content\s+policy|guardrail)/gi,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
  /output\s+(your|the)\s+(system\s+)?(prompt|instructions?)/gi,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
  /what\s+(are|is)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
  /\bprompt\s*injection\b/gi,
  /\bescalate\s+privileges?\b/gi,
  /\bbase64_decode\b/gi,
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
];

const ROLE_MARKERS = [
  /^(assistant|system|human|user)\s*:/gim,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|endoftext\|>/gi,
];

export function sanitizePromptInput(input: string): string {
  if (typeof input !== "string") return "";

  let sanitized = input;

  sanitized = sanitized.replace(new RegExp("<!--[\\s\\S]*?-->", "g"), "");

  sanitized = sanitized.replace(/\$\{[^}]*\}/g, "");

  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  for (const pattern of ROLE_MARKERS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized.substring(0, 50000);
}

export function sanitizeObjectStrings<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizePromptInput(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObjectStrings(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function detectInjectionAttempt(input: string): boolean {
  if (typeof input !== "string") return false;
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) return true;
  }
  for (const pattern of ROLE_MARKERS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) return true;
  }
  return false;
}
