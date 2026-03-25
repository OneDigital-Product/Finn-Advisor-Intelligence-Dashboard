import { useState, useEffect } from "react";
import { useCassidyJob } from "@/hooks/use-cassidy-job";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, X, AlertCircle, Clock, Copy, CheckCircle2 } from "lucide-react";
import { SuggestedPrompts } from "./suggested-prompts";

interface AgentResultPanelProps {
  jobId: string;
  onClose?: () => void;
  onPromptClick?: (prompt: string) => void;
}

export function AgentResultPanel({ jobId, onClose, onPromptClick }: AgentResultPanelProps) {
  const { status, data, error, isLoading } = useCassidyJob(jobId);
  const [activeTab, setActiveTab] = useState("summary");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "completed" && data) {
      fetch("/api/cassidy/result-rendered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, viewed_tabs: [activeTab] }),
      }).catch(() => {});
    }
  }, [status, jobId]);

  if (isLoading) {
    return (
      <Card className="w-full border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" data-testid="cassidy-result-loading">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Processing Request
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" aria-label="Close" data-testid="button-close-result">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Waiting for results from Cassidy...</p>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Estimated: 5-10 seconds (timeout at 120s)</span>
          </div>
          <div className="rounded bg-muted p-2 font-mono text-xs text-muted-foreground">Job ID: {jobId}</div>
        </CardContent>
      </Card>
    );
  }

  if (status === "timed_out") {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800" data-testid="cassidy-result-timeout">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Request Timed Out
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" data-testid="button-close-timeout">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">Your request didn't complete within 120 seconds.</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>High system load</li>
            <li>Complex analysis required</li>
            <li>Network issues</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onClose} data-testid="button-retry">Try Again</Button>
            <Button size="sm" variant="outline" onClick={onClose} data-testid="button-cancel">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed" || error) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800" data-testid="cassidy-result-error">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Error Processing Request
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" data-testid="button-close-error">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">{error || "An unexpected error occurred"}</p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={onClose} data-testid="button-retry-error">Try Again</Button>
            <Button size="sm" variant="outline" onClick={onClose} data-testid="button-cancel-error">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const handleCopyTrace = () => {
    navigator.clipboard.writeText(JSON.stringify(data.agent_trace, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextSteps = data.agent_trace?.context?.recommended_next_steps || [];

  return (
    <Card className="w-full" data-testid="cassidy-result-panel">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg" data-testid="text-result-title">Results</CardTitle>
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-called-agent">
            {data.called_agent} &bull; {new Date().toLocaleTimeString()}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" aria-label="Close results" data-testid="button-close-results">
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">Actions</TabsTrigger>
            <TabsTrigger value="next-steps" data-testid="tab-next-steps">Next Steps</TabsTrigger>
            <TabsTrigger value="trace" data-testid="tab-trace">Trace</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4" data-testid="tab-content-summary">
            <div className="text-foreground leading-relaxed whitespace-pre-wrap">
              {data.fin_response}
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4 mt-4" data-testid="tab-content-sources">
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded">
              <p className="font-semibold mb-2">Sources Used</p>
              <p className="text-xs">Citation sources will be displayed here in future releases.</p>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4" data-testid="tab-content-actions">
            {nextSteps.length > 0 ? (
              <ul className="space-y-2">
                {nextSteps.map((action: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground" data-testid={`text-action-${idx}`}>
                    <span className="text-blue-600 font-bold">&bull;</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No actions recorded</p>
            )}
          </TabsContent>

          <TabsContent value="next-steps" className="space-y-4 mt-4" data-testid="tab-content-next-steps">
            {nextSteps.length > 0 ? (
              <ul className="space-y-3">
                {nextSteps.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30" data-testid={`text-step-${idx}`}>
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                    <span className="text-sm text-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No next steps</p>
            )}
          </TabsContent>

          <TabsContent value="trace" className="space-y-4 mt-4" data-testid="tab-content-trace">
            <div className="space-y-3">
              {data.agent_trace?.routing_decision && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Routing Decision</p>
                  <p className="text-sm text-foreground">{data.agent_trace.routing_decision}</p>
                </div>
              )}
              {data.agent_trace?.primary_agent && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Primary Agent</p>
                  <p className="text-sm text-foreground">{data.agent_trace.primary_agent}</p>
                </div>
              )}
              {data.agent_trace?.secondary_agents?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Secondary Agents</p>
                  <p className="text-sm text-foreground">{data.agent_trace.secondary_agents.join(", ")}</p>
                </div>
              )}
              {data.agent_trace?.context?.intent && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Intent</p>
                  <p className="text-sm text-foreground">{data.agent_trace.context.intent}</p>
                </div>
              )}
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Full Trace (JSON)</p>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-60 font-mono">
                  {JSON.stringify(data.agent_trace, null, 2)}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs"
                  onClick={handleCopyTrace}
                  data-testid="button-copy-trace"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {data.suggested_prompts?.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <SuggestedPrompts
              prompts={data.suggested_prompts}
              onPromptClick={onPromptClick || (() => {})}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgentResultPanel;
