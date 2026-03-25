import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Square, CheckSquare, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";

const OD = {
  medBlue: "var(--color-brand-primary)",
  medGreen: "var(--color-success)",
  orange: "var(--color-orange)",
  lightBlue: "var(--color-brand-secondary)",
  text1: "var(--color-text-primary)",
  text2: "var(--color-text-secondary)",
  text3: "var(--color-text-tertiary)",
  border: "var(--color-border)",
};

function getPriorityColor(priority: string) {
  switch (priority) {
    case "critical":
    case "high": return "#EF4444";
    case "medium": return OD.orange;
    case "low": return OD.text3;
    default: return OD.text3;
  }
}

function getPriorityBg(priority: string) {
  switch (priority) {
    case "critical":
    case "high": return "rgba(239,68,68,0.12)";
    case "medium": return "rgba(244,125,32,0.12)";
    default: return "rgba(148,163,184,0.1)";
  }
}

export function ActionQueue({ liveTasks }: { liveTasks?: any[] } = {}) {
  const { toast } = useToast();

  const { data: allTasks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    staleTime: Infinity, // SSE event "reminder:created" invalidates this — no polling needed
    gcTime: 30 * 60 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status: "completed" });
      return res.json();
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      const prev = queryClient.getQueryData<any[]>(["/api/tasks"]);
      queryClient.setQueryData<any[]>(["/api/tasks"], (old) =>
        old?.map(t => t.id === id ? { ...t, status: "completed" } : t)
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(["/api/tasks"], context.prev);
      toast({ title: "Failed to complete task", variant: "destructive", duration: Infinity });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onSuccess: () => {
      toast({ title: "Task completed", duration: 3000 });
    },
  });

  // Merge local DB tasks with live SF tasks (if available)
  const localPending = allTasks?.filter(t => t.status !== "completed") || [];
  const sfTasks = (liveTasks || []).map((t: any) => ({
    id: t.id || `sf-${Math.random().toString(36).slice(2)}`,
    title: t.subject || "Task",
    status: (t.status || "open").toLowerCase(),
    priority: (t.priority || "medium").toLowerCase(),
    clientName: t.relatedTo || "",
    dueDate: t.activityDate || t.dueDate || t.createdDate || null,
    category: "salesforce",
    isLive: true,
  }));

  const priorityOrder: Record<string, number> = { high: 0, normal: 1, medium: 1, low: 2 };
  const sorted = (sfTasks.length > 0 ? sfTasks : localPending)
    .sort((a: any, b: any) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  const pendingTasks = sorted.slice(0, 10);

  if (isLoading && sfTasks.length === 0) {
    return <Skeleton className="h-48 w-full" style={{ borderRadius: 8 }} />;
  }

  return (
    <div style={{ padding: "8px 12px", maxHeight: 300, overflowY: "auto" }}>
      {pendingTasks.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No pending tasks right now."
        />
      )}
      {pendingTasks.map((task: any) => (
        <div
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 6,
            marginBottom: 2,
            cursor: "pointer",
            transition: "background .12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          data-testid={`task-${task.id}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              completeMutation.mutate(task.id);
            }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: task.status === "completed" ? OD.medGreen : OD.text3,
              flexShrink: 0,
            }}
            data-testid={`checkbox-task-${task.id}`}
          >
            {task.status === "completed" ? (
              <CheckSquare style={{ width: 14, height: 14, color: OD.medGreen }} />
            ) : (
              <Square style={{ width: 14, height: 14 }} />
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
            <div style={{ fontSize: 11, color: OD.text3 }}>
              {task.clientName && <span>{task.clientName} </span>}
              {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {task.category && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                background: "rgba(0,120,162,0.15)", color: OD.lightBlue, textTransform: "capitalize",
                fontFamily: "'JetBrains Mono', monospace",
              }}>{task.category === "salesforce" ? "Salesforce" : task.category}</span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
              background: getPriorityBg(task.priority),
              color: getPriorityColor(task.priority),
              fontFamily: "'JetBrains Mono', monospace",
            }}>{task.priority}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
