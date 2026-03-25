import { useReviewQueue } from "@/hooks/use-review-queue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Serif, Mono, Lbl } from "@/components/design";
import { FileCheck, UserCircle, FileText, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  advisorId?: string;
}

interface QueueSection {
  title: string;
  icon: any;
  count: number;
  dotColor: string;
}

export function ReviewQueueSidebar({ advisorId }: Props) {
  const { pendingFacts, pendingProfiles, pendingReports, pendingSignals, totalCount, isLoading } = useReviewQueue(advisorId);

  const sections: QueueSection[] = [
    { title: "Facts Pending", icon: FileCheck, count: pendingFacts.length, dotColor: "#6B8FE0" },
    { title: "Profiles to Commit", icon: UserCircle, count: pendingProfiles.length, dotColor: "#3D8B5E" },
    { title: "Reports Pending", icon: FileText, count: pendingReports.length, dotColor: "#B8872B" },
    { title: "Signals to Action", icon: AlertTriangle, count: pendingSignals.length, dotColor: "#C44B4B" },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: "hsl(var(--muted))" }} data-testid="review-queue-sidebar">
      <div className="p-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center justify-between">
          <Lbl>Review Queue</Lbl>
          {totalCount > 0 && (
            <Mono className="text-[12px] font-bold" data-testid="badge-total-count">{totalCount}</Mono>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-12" data-testid="text-queue-empty">
              <span className="text-[11px] font-medium text-muted-foreground/50">No pending items</span>
            </div>
          ) : (
            sections.map((section, i) => {
              if (section.count === 0) return null;
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="rounded-md p-3 animate-fu cursor-pointer transition-all"
                  style={{
                    background: "hsl(var(--muted))",
                    border: "1px solid hsl(var(--border))",
                    animationDelay: `${i * 50}ms`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = section.dotColor; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-[3px] h-[18px] rounded-sm" style={{ background: section.dotColor }} />
                    <Icon className="h-3.5 w-3.5" style={{ color: section.dotColor }} />
                    <span className="flex-1 text-[11px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>{section.title}</span>
                    <Mono className="text-[11px] font-bold">{section.count}</Mono>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 mt-2">
          <div className="rounded-md p-3 animate-fu" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", animationDelay: "200ms" }}>
            <Lbl>System Health</Lbl>
            <div className="mt-2.5">
              {[{ n: "Response", v: "—" }, { n: "Uptime", v: "—" }].map((m, i) => (
                <div key={i} className="flex justify-between items-center py-1.5" style={{ borderBottom: i < 1 ? "1px solid hsl(var(--border))" : "none" }}>
                  <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>{m.n}</span>
                  <div className="flex items-center gap-1.5">
                    <Mono className="text-[10px] font-semibold">{m.v}</Mono>
                    <span className="w-[5px] h-[5px] rounded-full bg-[#3D8B5E] animate-breathe" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
