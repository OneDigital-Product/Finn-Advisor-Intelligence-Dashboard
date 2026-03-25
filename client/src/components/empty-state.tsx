import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  timeEstimate?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  timeEstimate,
  secondaryLabel,
  onSecondary,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
      role="status"
      data-testid="empty-state"
    >
      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1" data-testid="empty-state-title">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed" data-testid="empty-state-description">
        {description}
      </p>
      {timeEstimate && (
        <p className="text-[10px] text-muted-foreground/70 mb-3" data-testid="empty-state-time">
          {timeEstimate}
        </p>
      )}
      <div className="flex items-center gap-2">
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} data-testid="empty-state-action">
            {ActionIcon && <ActionIcon className="w-3.5 h-3.5 mr-1.5" />}
            {actionLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button size="sm" variant="outline" onClick={onSecondary} data-testid="empty-state-secondary">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
