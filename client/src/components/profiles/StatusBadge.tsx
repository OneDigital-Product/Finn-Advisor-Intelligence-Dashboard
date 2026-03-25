import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { className: string; label: string }> = {
  draft: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "Draft" },
  in_progress: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "In Progress" },
  submitted: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", label: "Submitted" },
  finalized: { className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Finalized" },
  expired: { className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Expired" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge className={config.className} data-testid={`status-badge-${status}`}>
      {config.label}
    </Badge>
  );
}
