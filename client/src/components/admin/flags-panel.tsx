import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Flag, ToggleLeft, Percent, Cloud, Bot, Video, Mail, TrendingUp, GitBranch } from "lucide-react";
import type { FeatureFlag } from "@shared/schema";

import type { LucideIcon } from "lucide-react";

const flagIcons: Record<string, LucideIcon> = {
  ai_enabled: Bot,
  salesforce_integration: Cloud,
  orion_integration: TrendingUp,
  outlook_integration: Mail,
  zoom_integration: Video,
  monte_carlo_enabled: TrendingUp,
  workflow_builder_enabled: GitBranch,
};

export function FlagsPanel() {
  const { toast } = useToast();

  const { data: flags, isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/admin/flags"],
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, enabled, rolloutPercentage }: { key: string; enabled: boolean; rolloutPercentage?: number }) => {
      const res = await apiRequest("POST", `/api/admin/flags/${key}`, { enabled, rolloutPercentage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flags"] });
      toast({ title: "Flag updated", description: "Feature flag has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update feature flag.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" data-testid={`skeleton-flag-${i}`} />
        ))}
      </div>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p data-testid="text-no-flags">No feature flags configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="flags-panel">
      <div className="grid gap-4">
        {flags.map((flag) => {
          const IconComponent = flagIcons[flag.key] || ToggleLeft;
          const isIntegration = flag.key.includes("integration");

          return (
            <Card key={flag.key} className="transition-shadow hover:shadow-md" data-testid={`card-flag-${flag.key}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 ${flag.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium" data-testid={`text-flag-key-${flag.key}`}>{flag.key}</span>
                        {isIntegration && (
                          <Badge variant="outline" className="text-xs">Integration</Badge>
                        )}
                        <Badge
                          variant={flag.enabled ? "default" : "secondary"}
                          className="text-xs"
                          data-testid={`badge-flag-status-${flag.key}`}
                        >
                          {flag.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-flag-desc-${flag.key}`}>
                          {flag.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {flag.enabled && (
                      <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2">
                        <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                        <Slider
                          value={[flag.rolloutPercentage ?? 100]}
                          onValueChange={([value]) => {
                            updateMutation.mutate({
                              key: flag.key,
                              enabled: flag.enabled,
                              rolloutPercentage: value,
                            });
                          }}
                          min={0}
                          max={100}
                          step={10}
                          className="w-28"
                          data-testid={`slider-rollout-${flag.key}`}
                        />
                        <span className="text-sm font-mono w-10 text-right" data-testid={`text-rollout-pct-${flag.key}`}>
                          {flag.rolloutPercentage ?? 100}%
                        </span>
                      </div>
                    )}

                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => {
                        updateMutation.mutate({
                          key: flag.key,
                          enabled,
                          rolloutPercentage: enabled ? (flag.rolloutPercentage ?? 100) : (flag.rolloutPercentage ?? undefined),
                        });
                      }}
                      disabled={updateMutation.isPending}
                      data-testid={`switch-flag-${flag.key}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
