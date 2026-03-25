import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMutation, useQuery } from "@tanstack/react-query";

const mockToast = vi.fn();
vi.mocked(vi.fn());

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

function setupMutationCapture() {
  const captured: { mutate: ReturnType<typeof vi.fn>; mutationFn?: Function } = {
    mutate: vi.fn(),
  };
  vi.mocked(useMutation).mockImplementation((options: any) => {
    captured.mutationFn = options.mutationFn;
    return {
      mutate: captured.mutate,
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
  return captured;
}

beforeEach(() => {
  mockToast.mockClear();
  vi.mocked(useQuery).mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  } as any);
});

describe("RMD Calculator", () => {
  let RMDPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/rmd-calculator");
    RMDPage = mod.default;
  });

  it("renders the page with title and empty results prompt", () => {
    render(<RMDPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("RMD Calculator");
    expect(screen.getByTestId("text-empty-results")).toHaveTextContent("Enter parameters to calculate");
  });

  it("renders all required input fields", () => {
    render(<RMDPage />);
    expect(screen.getByTestId("input-dob")).toBeInTheDocument();
    expect(screen.getByTestId("input-balance")).toBeInTheDocument();
    expect(screen.getByTestId("input-tax-year")).toBeInTheDocument();
    expect(screen.getByTestId("button-calculate")).toBeInTheDocument();
  });

  it("shows validation error when required fields are empty", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<RMDPage />);
    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing required fields",
        variant: "destructive",
      })
    );
  });

  it("calls mutation when valid inputs are provided", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<RMDPage />);
    fireEvent.change(screen.getByTestId("input-dob"), { target: { value: "1955-06-15" } });
    fireEvent.change(screen.getByTestId("input-balance"), { target: { value: "500000" } });
    fireEvent.change(screen.getByTestId("input-tax-year"), { target: { value: "2025" } });

    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(captured.mutate).toHaveBeenCalled();
  });
});

describe("Budget Calculator", () => {
  let BudgetPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/budget-calculator");
    BudgetPage = mod.default;
  });

  it("renders the page with title and empty results prompt", () => {
    render(<BudgetPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("Budget Calculator");
    expect(screen.getByTestId("text-empty-results")).toHaveTextContent("Enter parameters to calculate");
  });

  it("renders expense inputs", () => {
    render(<BudgetPage />);
    expect(screen.getByTestId("input-expense-housing")).toBeInTheDocument();
    expect(screen.getByTestId("input-expense-healthcare")).toBeInTheDocument();
    expect(screen.getByTestId("input-expense-food")).toBeInTheDocument();
  });

  it("updates total expenses when values change", () => {
    render(<BudgetPage />);
    fireEvent.change(screen.getByTestId("input-expense-housing"), { target: { value: "24000" } });
    fireEvent.change(screen.getByTestId("input-expense-food"), { target: { value: "9600" } });

    expect(screen.getByTestId("text-total-expenses")).toHaveTextContent("$33,600");
  });

  it("calls mutation on form submit", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<BudgetPage />);
    fireEvent.change(screen.getByTestId("input-age"), { target: { value: "65" } });

    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(captured.mutate).toHaveBeenCalled();
  });
});

describe("Roth Conversion Calculator", () => {
  let RothPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/roth-conversion-calculator");
    RothPage = mod.default;
  });

  it("renders the page with title", () => {
    render(<RothPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("Roth Conversion");
  });

  it("shows validation error when required fields are empty", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<RothPage />);
    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing required fields",
        variant: "destructive",
      })
    );
  });

  it("calls mutation with valid inputs", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<RothPage />);
    fireEvent.change(screen.getByTestId("input-trad-balance"), { target: { value: "500000" } });
    fireEvent.change(screen.getByTestId("input-annual-income"), { target: { value: "120000" } });
    fireEvent.change(screen.getByTestId("input-conversion-amount"), { target: { value: "50000" } });

    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(captured.mutate).toHaveBeenCalled();
  });
});

describe("Tax Bracket Calculator", () => {
  let TaxPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/tax-bracket-calculator");
    TaxPage = mod.default;
  });

  it("renders the page with title", () => {
    render(<TaxPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("Tax Bracket");
  });

  it("shows validation error when income is empty", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<TaxPage />);
    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing required fields",
        variant: "destructive",
      })
    );
  });

  it("calls mutation with valid income", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<TaxPage />);
    fireEvent.change(screen.getByTestId("input-gross-income"), { target: { value: "150000" } });

    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(captured.mutate).toHaveBeenCalled();
  });
});

describe("Asset Location Calculator", () => {
  let AssetPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/asset-location-calculator");
    AssetPage = mod.default;
  });

  it("renders the page with title", () => {
    render(<AssetPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("Asset Location");
  });

  it("shows validation error when no valid holdings", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<AssetPage />);
    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing data",
        variant: "destructive",
      })
    );
  });

  it("renders calculate button", () => {
    render(<AssetPage />);
    expect(screen.getByTestId("button-calculate")).toBeInTheDocument();
  });
});

describe("QSBS Calculator", () => {
  let QSBSPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/qsbs-calculator");
    QSBSPage = mod.default;
  });

  it("renders the page with title", () => {
    render(<QSBSPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("QSBS");
  });

  it("renders calculate button", () => {
    render(<QSBSPage />);
    expect(screen.getByTestId("button-calculate")).toBeInTheDocument();
  });
});

describe("QSBS Tracker Calculator", () => {
  let QSBSTrackerPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/qsbs-tracker-calculator");
    QSBSTrackerPage = mod.default;
  });

  it("renders the page with title", () => {
    render(<QSBSTrackerPage />);
    expect(screen.getByTestId("text-page-title")).toHaveTextContent("QSBS");
  });

  it("shows validation error when no valid positions", () => {
    const captured = setupMutationCapture();
    vi.resetModules();

    render(<QSBSTrackerPage />);
    const form = screen.getByTestId("button-calculate").closest("form")!;
    fireEvent.submit(form);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Missing data",
        variant: "destructive",
      })
    );
  });
});

describe("Monte Carlo Simulator", () => {
  let MonteCarloPage: any;

  beforeEach(async () => {
    vi.resetModules();
    setupMutationCapture();
    const mod = await import("../pages/monte-carlo");
    MonteCarloPage = mod.default;
  });

  it("renders the page with run simulation button", () => {
    render(<MonteCarloPage />);
    expect(screen.getByTestId("button-run-simulation")).toBeInTheDocument();
  });

  it("renders tab navigation", () => {
    render(<MonteCarloPage />);
    expect(screen.getByTestId("tab-overview")).toBeInTheDocument();
    expect(screen.getByTestId("tab-allocation")).toBeInTheDocument();
  });
});
