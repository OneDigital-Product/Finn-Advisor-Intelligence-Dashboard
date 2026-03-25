import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { Component, type ReactNode } from "react";

import AssetLocationCalculatorPage from "../src/pages/asset-location-calculator";
import BudgetCalculatorPage from "../src/pages/budget-calculator";
import QSBSCalculatorPage from "../src/pages/qsbs-calculator";
import QSBSTrackerCalculatorPage from "../src/pages/qsbs-tracker-calculator";
import RMDCalculatorPage from "../src/pages/rmd-calculator";
import RothConversionCalculatorPage from "../src/pages/roth-conversion-calculator";
import TaxBracketCalculatorPage from "../src/pages/tax-bracket-calculator";
import TaxStrategyPage from "../src/pages/tax-strategy";
import MonteCarlo from "../src/pages/monte-carlo";

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

async function triggerFormSubmit(container: HTMLElement) {
  const form = container.querySelector("form") as HTMLFormElement;
  if (form) {
    await act(async () => {
      fireEvent.submit(form);
    });
    await act(async () => {
      if ((globalThis as any).__lastMutationPromise) {
        await (globalThis as any).__lastMutationPromise;
      }
    });
  }
}

async function triggerButtonClick(container: HTMLElement) {
  const btn = container.querySelector("[data-testid='button-calculate']") as HTMLElement;
  if (btn) {
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      if ((globalThis as any).__lastMutationPromise) {
        await (globalThis as any).__lastMutationPromise;
      }
    });
  }
}

describe("Calculator UI Snapshots — initial form layout", () => {
  it("AssetLocationCalculatorPage renders form layout", () => {
    const { container } = render(<AssetLocationCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("BudgetCalculatorPage renders form layout", () => {
    const { container } = render(<BudgetCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("QSBSCalculatorPage renders form layout", () => {
    const { container } = render(<QSBSCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("QSBSTrackerCalculatorPage renders form layout", () => {
    const { container } = render(<QSBSTrackerCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("RMDCalculatorPage renders form layout", () => {
    const { container } = render(<RMDCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("RothConversionCalculatorPage renders form layout", () => {
    const { container } = render(<RothConversionCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("TaxBracketCalculatorPage renders form layout", () => {
    const { container } = render(<TaxBracketCalculatorPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("TaxStrategyPage renders hub layout", () => {
    const { container } = render(<TaxStrategyPage />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("MonteCarlo renders simulator layout", () => {
    const { container } = render(<MonteCarlo />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("Calculator UI Snapshots — post-calculation results", () => {
  beforeEach(() => {
    (globalThis as any).__lastMutationPromise = undefined;
  });

  it("AssetLocationCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><AssetLocationCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const name = container.querySelector("[data-testid='input-holding-name-0']") as HTMLInputElement;
      const value = container.querySelector("[data-testid='input-holding-value-0']") as HTMLInputElement;
      if (name) fireEvent.change(name, { target: { value: "S&P 500 ETF" } });
      if (value) fireEvent.change(value, { target: { value: "500000" } });
    });
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='text-annual-savings']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("QSBSCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><QSBSCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const name = container.querySelector("[data-testid='input-company-name-0']") as HTMLInputElement;
      const date = container.querySelector("[data-testid='input-acq-date-0']") as HTMLInputElement;
      const cost = container.querySelector("[data-testid='input-cost-basis-0']") as HTMLInputElement;
      const val = container.querySelector("[data-testid='input-current-value-0']") as HTMLInputElement;
      if (name) fireEvent.change(name, { target: { value: "TechStartup Inc" } });
      if (date) fireEvent.change(date, { target: { value: "2020-01-15" } });
      if (cost) fireEvent.change(cost, { target: { value: "100000" } });
      if (val) fireEvent.change(val, { target: { value: "5000000" } });
    });
    await triggerButtonClick(container);
    expect(container.querySelector("[data-testid='text-total-savings']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("QSBSTrackerCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><QSBSTrackerCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const name = container.querySelector("[data-testid='input-company-0']") as HTMLInputElement;
      const date = container.querySelector("[data-testid='input-acq-date-0']") as HTMLInputElement;
      const cost = container.querySelector("[data-testid='input-cost-basis-0']") as HTMLInputElement;
      const val = container.querySelector("[data-testid='input-current-value-0']") as HTMLInputElement;
      if (name) fireEvent.change(name, { target: { value: "StartupCo" } });
      if (date) fireEvent.change(date, { target: { value: "2019-06-01" } });
      if (cost) fireEvent.change(cost, { target: { value: "100000" } });
      if (val) fireEvent.change(val, { target: { value: "2000000" } });
    });
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='text-total-savings']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("RMDCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><RMDCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const dob = container.querySelector("[data-testid='input-dob']") as HTMLInputElement;
      const balance = container.querySelector("[data-testid='input-balance']") as HTMLInputElement;
      const year = container.querySelector("[data-testid='input-tax-year']") as HTMLInputElement;
      if (dob) fireEvent.change(dob, { target: { value: "1952-01-15" } });
      if (balance) fireEvent.change(balance, { target: { value: "1200000" } });
      if (year) fireEvent.change(year, { target: { value: "2026" } });
    });
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='text-current-rmd']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("BudgetCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><BudgetCalculatorPage /></ErrorBoundary>
    );
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='tabs-scenarios']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("RothConversionCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><RothConversionCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const balance = container.querySelector("[data-testid='input-trad-balance']") as HTMLInputElement;
      const income = container.querySelector("[data-testid='input-annual-income']") as HTMLInputElement;
      const amount = container.querySelector("[data-testid='input-conversion-amount']") as HTMLInputElement;
      if (balance) fireEvent.change(balance, { target: { value: "500000" } });
      if (income) fireEvent.change(income, { target: { value: "150000" } });
      if (amount) fireEvent.change(amount, { target: { value: "100000" } });
    });
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='text-tax-on-conversion']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("TaxBracketCalculatorPage shows results after calculation", async () => {
    const { container } = render(
      <ErrorBoundary><TaxBracketCalculatorPage /></ErrorBoundary>
    );
    await act(async () => {
      const income = container.querySelector("[data-testid='input-gross-income']") as HTMLInputElement;
      if (income) fireEvent.change(income, { target: { value: "200000" } });
    });
    await triggerFormSubmit(container);
    expect(container.querySelector("[data-testid='text-total-tax']")).not.toBeNull();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("MonteCarlo shows results after simulation", async () => {
    vi.useFakeTimers();
    let seed = 42;
    const mockRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    });
    const { container } = render(
      <ErrorBoundary><MonteCarlo /></ErrorBoundary>
    );
    const btn = container.querySelector("[data-testid='button-run-simulation']") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    mockRandom.mockRestore();
    vi.useRealTimers();
    expect(container.innerHTML).toContain("Success Rate");
    expect(container.innerHTML).toMatchSnapshot();
  });
});
