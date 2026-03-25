import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";

interface TraceDetailPanelProps {
  details: Record<string, any>;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

export function TraceDetailPanel({ details }: TraceDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const entries = Object.entries(details);

  return (
    <div className="space-y-3" data-testid="trace-detail-panel">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{formatKey(key)}</p>
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <pre className="bg-muted dark:bg-muted/50 rounded p-2 text-xs font-mono overflow-auto max-h-40">
              <code>{formatValue(value)}</code>
            </pre>
          ) : (
            <p className="text-sm text-foreground">{formatValue(value)}</p>
          )}
        </div>
      ))}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          data-testid="button-copy-details"
        >
          {copied ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1.5" />
              Copy JSON
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
