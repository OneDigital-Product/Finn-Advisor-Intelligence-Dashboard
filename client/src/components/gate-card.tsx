import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface GateCardProps {
  name: string;
  description: string;
  metric: string | number;
  threshold: string | number;
  status: "passed" | "at-risk" | "not-met";
  progress: number;
}

const statusConfig = {
  passed: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    progressColor: "[&>div]:bg-green-600",
  },
  "at-risk": {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    progressColor: "[&>div]:bg-amber-500",
  },
  "not-met": {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    progressColor: "[&>div]:bg-red-500",
  },
};

export function GateCard({ name, description, metric, threshold, status, progress }: GateCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.bg} ${config.border} border`} data-testid={`gate-card-${name.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{name}</h3>
          <StatusIcon className={`w-5 h-5 ${config.color}`} data-testid={`gate-status-${status}`} />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-mono font-medium">{metric}</span>
            <span className="text-muted-foreground">/ {threshold}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className={`h-2 ${config.progressColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}
