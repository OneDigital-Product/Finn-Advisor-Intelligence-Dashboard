import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string;
  as?: "div" | "style";
  className?: string;
  "data-testid"?: string;
}

export function SafeHtml({ html, as: Tag = "div", className, "data-testid": testId }: SafeHtmlProps) {
  return (
    <Tag
      className={className}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
