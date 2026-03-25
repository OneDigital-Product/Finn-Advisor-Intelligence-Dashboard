import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CassidyAnalysisButton } from "../components/cassidy/cassidy-analysis-button";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  SheetDescription: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <span data-testid="icon-loader" {...props} />,
  Sparkles: (props: any) => <span data-testid="icon-sparkles" {...props} />,
  AlertCircle: (props: any) => <span data-testid="icon-alert" {...props} />,
  CheckCircle2: (props: any) => <span {...props} />,
  ChevronRight: (props: any) => <span {...props} />,
  Clock: (props: any) => <span {...props} />,
  X: (props: any) => <span {...props} />,
}));

vi.mock("../components/cassidy/cassidy-result-panel", () => ({
  CassidyResultPanel: ({ open, jobStatus, result, error, onRetry, onClose }: any) => {
    if (!open) return null;
    return (
      <div data-testid="cassidy-result-panel">
        <span data-testid="panel-job-status">{jobStatus}</span>
        {error && <span data-testid="panel-error">{error}</span>}
        {result?.status === "completed" && <span data-testid="panel-completed">Completed</span>}
        <button data-testid="button-panel-retry" onClick={onRetry}>Retry</button>
        <button data-testid="button-panel-close" onClick={onClose}>Close</button>
      </div>
    );
  },
}));

const defaultProps = {
  taskType: "analysis" as const,
  clientId: "client-1",
  context: { key: "value" },
};

describe("CassidyAnalysisButton", () => {
  beforeEach(() => {
    mockToast.mockClear();
    vi.clearAllMocks();
  });

  it("renders in idle state with default label", () => {
    render(<CassidyAnalysisButton {...defaultProps} />);
    const button = screen.getByTestId("button-cassidy-analysis-analysis");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Analyze");
    expect(button).not.toBeDisabled();
  });

  it("renders with custom label", () => {
    render(<CassidyAnalysisButton {...defaultProps} label="Run Analysis" />);
    expect(screen.getByTestId("button-cassidy-analysis-analysis")).toHaveTextContent("Run Analysis");
  });

  it("renders disabled when disabled prop is true", () => {
    render(<CassidyAnalysisButton {...defaultProps} disabled />);
    expect(screen.getByTestId("button-cassidy-analysis-analysis")).toBeDisabled();
  });

  it("shows loading state on click and calls API", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({ job_id: "job-123" }),
    } as any);

    render(<CassidyAnalysisButton {...defaultProps} />);

    const button = screen.getByTestId("button-cassidy-analysis-analysis");
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("POST", "/api/cassidy/request", expect.objectContaining({
        task_type: "analysis",
        client_id: "client-1",
      }));
    });
  });

  it("shows error state when API request fails", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockRejectedValue(new Error("Network error"));

    render(<CassidyAnalysisButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId("button-cassidy-analysis-analysis"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Analysis failed",
          variant: "destructive",
        })
      );
    });
  });

  it("shows error when no job_id returned", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({}),
    } as any);

    render(<CassidyAnalysisButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId("button-cassidy-analysis-analysis"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Analysis failed",
          variant: "destructive",
        })
      );
    });
  });

  it("opens result panel on click when displayMode is panel", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({ job_id: "job-123" }),
    } as any);

    render(<CassidyAnalysisButton {...defaultProps} displayMode="panel" />);

    fireEvent.click(screen.getByTestId("button-cassidy-analysis-analysis"));

    await waitFor(() => {
      expect(screen.getByTestId("cassidy-result-panel")).toBeInTheDocument();
    });
  });

  it("renders inline loading state when displayMode is inline", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockImplementation(() => new Promise(() => {}));

    render(<CassidyAnalysisButton {...defaultProps} displayMode="inline" />);

    fireEvent.click(screen.getByTestId("button-cassidy-analysis-analysis"));

    await waitFor(() => {
      expect(screen.getByTestId("cassidy-inline-loading")).toBeInTheDocument();
    });
  });

  it("submits correct payload including task type and client context", async () => {
    const { apiRequest } = await import("@/lib/queryClient");
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({ job_id: "job-456" }),
    } as any);

    render(
      <CassidyAnalysisButton
        taskType="intake_extraction"
        clientId="client-99"
        context={{ source: "test" }}
      />
    );

    fireEvent.click(screen.getByTestId("button-cassidy-analysis-intake_extraction"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("POST", "/api/cassidy/request", expect.objectContaining({
        task_type: "intake_extraction",
        client_id: "client-99",
        client_context: { source: "test" },
      }));
    });
  });

  it("supports different task types via data-testid", () => {
    render(
      <CassidyAnalysisButton
        taskType="report_generation"
        clientId="client-1"
        context={{}}
      />
    );
    expect(screen.getByTestId("button-cassidy-analysis-report_generation")).toBeInTheDocument();
  });

  it("supports different button variants and sizes", () => {
    render(
      <CassidyAnalysisButton
        {...defaultProps}
        variant="outline"
        size="lg"
      />
    );
    const button = screen.getByTestId("button-cassidy-analysis-analysis");
    expect(button).toBeInTheDocument();
  });
});
