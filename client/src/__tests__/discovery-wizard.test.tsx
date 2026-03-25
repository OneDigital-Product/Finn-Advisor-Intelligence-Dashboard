import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuery, useMutation } from "@tanstack/react-query";

const mockToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/discovery/test-session-1", mockNavigate],
  useRoute: (pattern: string) => {
    if (pattern === "/discovery/:id") {
      return [true, { id: "test-session-1" }];
    }
    return [false, null];
  },
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockSession = {
  id: "test-session-1",
  prospectName: "John Doe",
  clientType: "individual",
  status: "in_progress",
  questionnaireId: "q-1",
  questionnaireResponses: {},
  wizardResponses: {},
  currentSection: 0,
  createdAt: "2025-01-01",
};

const mockQuestionnaire = {
  id: "q-1",
  name: "Individual Discovery",
  clientType: "individual",
  sections: [
    {
      title: "Background",
      description: "Personal info",
      questions: [
        { id: "q1", label: "Full Name", type: "text" },
      ],
    },
  ],
};

function setupMocks() {
  const mutateFns: Record<string, ReturnType<typeof vi.fn>> = {};

  vi.mocked(useQuery).mockImplementation(({ queryKey }: any) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === "/api/discovery/sessions") {
      return { data: mockSession, isLoading: false, error: null } as any;
    }
    if (key === "/api/discovery/questionnaires") {
      return { data: mockQuestionnaire, isLoading: false, error: null } as any;
    }
    if (key === "/api/discovery/templates") {
      return { data: [], isLoading: false, error: null } as any;
    }
    return { data: null, isLoading: false, error: null } as any;
  });

  let mutationIndex = 0;
  vi.mocked(useMutation).mockImplementation((options: any) => {
    const idx = mutationIndex++;
    const mutateFn = vi.fn();
    mutateFns[`mutation-${idx}`] = mutateFn;
    return {
      mutate: mutateFn,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: null,
      reset: vi.fn(),
      variables: undefined,
      isIdle: true,
      isSuccess: false,
      status: "idle",
      failureCount: 0,
      failureReason: null,
      context: undefined,
      submittedAt: 0,
      isPaused: false,
    } as any;
  });

  return mutateFns;
}

describe("Discovery Wizard", () => {
  let DiscoveryPage: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    vi.resetModules();
    mockToast.mockClear();
    mockNavigate.mockClear();
    user = userEvent.setup();
    setupMocks();
    const mod = await import("../pages/discovery");
    DiscoveryPage = mod.default;
  });

  it("renders the session detail with prospect name", () => {
    render(<DiscoveryPage />);
    expect(screen.getByTestId("text-session-title")).toHaveTextContent("John Doe");
  });

  it("renders wizard tab and navigation buttons", () => {
    render(<DiscoveryPage />);
    expect(screen.getByTestId("tab-wizard")).toBeInTheDocument();
    expect(screen.getByTestId("tab-questionnaire")).toBeInTheDocument();
  });

  it("renders wizard section buttons for all 6 sections", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    expect(screen.getByTestId("button-wizard-section-background")).toBeInTheDocument();
    expect(screen.getByTestId("button-wizard-section-financial")).toBeInTheDocument();
    expect(screen.getByTestId("button-wizard-section-values")).toBeInTheDocument();
    expect(screen.getByTestId("button-wizard-section-moneyStory")).toBeInTheDocument();
    expect(screen.getByTestId("button-wizard-section-risk")).toBeInTheDocument();
    expect(screen.getByTestId("button-wizard-section-goals")).toBeInTheDocument();
  });

  it("shows Previous button disabled on first section", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    const prevButton = screen.getByTestId("button-wizard-prev");
    expect(prevButton).toBeDisabled();
  });

  it("advances to next section when clicking Next", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    await user.click(screen.getByTestId("button-wizard-next"));

    const prevButton = screen.getByTestId("button-wizard-prev");
    expect(prevButton).not.toBeDisabled();
  });

  it("shows section counter (1 of 6)", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    expect(screen.getByText("1 of 6")).toBeInTheDocument();
  });

  it("navigates directly to a section when clicking its sidebar button", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    await user.click(screen.getByTestId("button-wizard-section-values"));
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
  });

  it("shows Complete button on the last section instead of Next", async () => {
    render(<DiscoveryPage />);
    await user.click(screen.getByTestId("tab-wizard"));

    await user.click(screen.getByTestId("button-wizard-section-goals"));

    expect(screen.getByText("6 of 6")).toBeInTheDocument();
    expect(screen.getByTestId("button-complete-discovery")).toBeInTheDocument();
    expect(screen.queryByTestId("button-wizard-next")).not.toBeInTheDocument();
  });

  it("renders save and back buttons", () => {
    render(<DiscoveryPage />);
    expect(screen.getByTestId("button-save-session")).toBeInTheDocument();
    expect(screen.getByTestId("button-back-discovery")).toBeInTheDocument();
  });
});
