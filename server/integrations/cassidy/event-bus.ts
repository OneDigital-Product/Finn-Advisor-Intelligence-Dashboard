import { EventEmitter } from "events";

export interface JobUpdate {
  type: string;
  job_id: string;
  status: "in_progress" | "completed" | "failed" | "timed_out" | "pending" | "draft" | "received" | "running";
  fin_response?: string;
  fin_report?: string;
  suggested_prompts?: string[];
  called_agent?: string;
  agent_trace?: Record<string, unknown>;
  error?: string;
  timestamp: string;
  output?: Record<string, unknown>;
  draft_id?: string;
  chain_position?: number;
  chain_status?: string;
  agent_name?: string;
  duration_ms?: number;
  merged_output?: Record<string, unknown>;
}

class JobEventBus extends EventEmitter {
  private activeJobs = new Set<string>();

  publishJobUpdate(update: JobUpdate): void {
    const eventName = `job:${update.job_id}`;
    this.activeJobs.add(update.job_id);
    this.emit(eventName, update);

    if (["completed", "failed", "timed_out"].includes(update.status)) {
      setTimeout(() => {
        this.removeAllListeners(eventName);
        this.activeJobs.delete(update.job_id);
      }, 5000);
    }
  }

  subscribeToJob(jobId: string, callback: (update: JobUpdate) => void): () => void {
    const eventName = `job:${jobId}`;
    this.on(eventName, callback);
    return () => {
      this.removeListener(eventName, callback);
    };
  }

  getSubscriberCount(jobId: string): number {
    return this.listenerCount(`job:${jobId}`);
  }

  getActiveJobs(): string[] {
    return Array.from(this.activeJobs);
  }
}

export const jobEventBus = new JobEventBus();
