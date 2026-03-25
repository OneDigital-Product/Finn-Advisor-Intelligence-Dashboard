import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle } from "lucide-react";

type GlossaryEntry = {
  term: string;
  definition: string;
  why: string;
};

const GLOSSARY: Record<string, GlossaryEntry> = {
  grat: {
    term: "GRAT",
    definition: "Grantor Retained Annuity Trust — an irrevocable trust that pays a fixed annuity to the grantor for a set term, then transfers remaining assets to beneficiaries.",
    why: "Transfers future appreciation to heirs with minimal or zero gift tax cost.",
  },
  ilit: {
    term: "ILIT",
    definition: "Irrevocable Life Insurance Trust — a trust that owns a life insurance policy, keeping proceeds outside the insured's taxable estate.",
    why: "Provides estate liquidity for heirs while avoiding estate tax on the death benefit.",
  },
  slat: {
    term: "SLAT",
    definition: "Spousal Lifetime Access Trust — an irrevocable trust created by one spouse for the benefit of the other, removing assets from both estates.",
    why: "Uses the gift-tax exemption while retaining indirect access to trust assets through the beneficiary spouse.",
  },
  qprt: {
    term: "QPRT",
    definition: "Qualified Personal Residence Trust — transfers a home to an irrevocable trust while the grantor retains the right to live there for a set term.",
    why: "Passes a residence to heirs at a discounted gift-tax value, reducing the taxable estate.",
  },
  crt: {
    term: "CRT",
    definition: "Charitable Remainder Trust — an irrevocable trust that pays income to the donor (or beneficiaries) for life or a term, then distributes the remainder to charity.",
    why: "Generates an immediate income-tax deduction, diversifies concentrated positions tax-free, and supports charitable goals.",
  },
  clat: {
    term: "CLAT",
    definition: "Charitable Lead Annuity Trust — an irrevocable trust that pays a fixed annuity to charity for a set term, then transfers remaining assets to non-charitable beneficiaries.",
    why: "Reduces gift or estate tax on wealth transfers while supporting charitable giving during the trust term.",
  },
  daf: {
    term: "DAF",
    definition: "Donor-Advised Fund — a charitable giving vehicle that provides an immediate tax deduction and allows the donor to recommend grants to charities over time.",
    why: "Bunches charitable deductions into a single year for maximum tax benefit and simplifies giving.",
  },
  qcd: {
    term: "QCD",
    definition: "Qualified Charitable Distribution — a direct transfer from an IRA to a qualified charity (up to $105,000/yr), satisfying RMD requirements without increasing taxable income.",
    why: "Reduces AGI, which can lower Medicare premiums (IRMAA) and taxation of Social Security benefits.",
  },
  qsbs: {
    term: "QSBS",
    definition: "Qualified Small Business Stock — stock in a domestic C-corporation with gross assets ≤ $50M, held for 5+ years, potentially excluding up to $10M (or 10× basis) of gain from federal tax under Section 1202.",
    why: "Can eliminate federal capital gains tax on qualifying startup or small-business exits.",
  },
  rmd: {
    term: "RMD",
    definition: "Required Minimum Distribution — the minimum amount that must be withdrawn annually from tax-deferred retirement accounts (traditional IRA, 401(k)) starting at age 73.",
    why: "Failing to take an RMD triggers a 25% excise tax on the shortfall amount.",
  },
  irmaa: {
    term: "IRMAA",
    definition: "Income-Related Monthly Adjustment Amount — a surcharge added to Medicare Part B and Part D premiums when modified AGI exceeds certain thresholds.",
    why: "Large Roth conversions, capital gains, or RMDs can push income into a higher IRMAA bracket, increasing Medicare costs.",
  },
  roth_conversion: {
    term: "Roth Conversion",
    definition: "Moving funds from a traditional IRA or 401(k) to a Roth IRA, paying income tax now in exchange for tax-free growth and withdrawals in the future.",
    why: "Strategic conversions during low-income years can reduce lifetime tax liability and eliminate RMDs.",
  },
  roth_ladder: {
    term: "Roth Ladder",
    definition: "A multi-year strategy of converting small amounts from a traditional IRA to a Roth IRA each year, staying within lower tax brackets.",
    why: "Spreads the tax impact across years and fills up low brackets before they expire or change.",
  },
  tax_alpha: {
    term: "Tax Alpha",
    definition: "The additional after-tax return generated through tax-efficient investment management, including loss harvesting, asset location, and gain deferral.",
    why: "Tax alpha can add 0.5–1.5% to annual after-tax returns without taking additional investment risk.",
  },
  tracking_error: {
    term: "Tracking Error",
    definition: "The standard deviation of the difference between a portfolio's returns and its benchmark's returns.",
    why: "In direct indexing, higher tracking error may indicate more aggressive loss harvesting — a trade-off between tax savings and benchmark fidelity.",
  },
  tax_loss_harvesting: {
    term: "Tax-Loss Harvesting",
    definition: "Selling securities at a loss to offset capital gains, then reinvesting in similar (but not identical) securities to maintain market exposure.",
    why: "Reduces current-year tax liability while maintaining long-term portfolio positioning.",
  },
  direct_indexing: {
    term: "Direct Indexing",
    definition: "Owning individual securities that replicate an index (rather than an ETF or mutual fund), enabling personalized tax-loss harvesting at the individual lot level.",
    why: "Generates more harvesting opportunities than fund-based investing, especially in volatile markets.",
  },
  wash_sale: {
    term: "Wash Sale",
    definition: "An IRS rule that disallows a tax loss if a substantially identical security is purchased within 30 days before or after the sale.",
    why: "Violating wash-sale rules defers (doesn't eliminate) the loss, reducing the tax benefit of harvesting.",
  },
  asset_location: {
    term: "Asset Location",
    definition: "The strategy of placing investments in the most tax-efficient account type — taxable, tax-deferred (traditional IRA), or tax-exempt (Roth IRA).",
    why: "Proper asset location can add 0.25–0.75% in annual after-tax returns without changing investment risk.",
  },
  monte_carlo: {
    term: "Monte Carlo Simulation",
    definition: "A statistical method that runs thousands of randomized market scenarios to estimate the probability of a financial plan succeeding.",
    why: "Provides a success-rate percentage rather than a single projection, helping clients understand plan resilience.",
  },
  success_rate: {
    term: "Success Rate",
    definition: "The percentage of simulated scenarios in which the portfolio lasts through the client's life expectancy without running out of money.",
    why: "A rate above 80% is generally considered strong; below 60% may require plan adjustments.",
  },
  std_dev: {
    term: "Standard Deviation",
    definition: "A measure of investment return volatility — how much returns deviate from the average in a typical year.",
    why: "Higher standard deviation means wider outcome ranges in Monte Carlo simulations.",
  },
  safe_withdrawal: {
    term: "Safe Withdrawal Rate",
    definition: "The maximum percentage of a portfolio that can be withdrawn annually (adjusted for inflation) with high confidence of not depleting assets.",
    why: "The traditional 4% rule is a starting point; actual safe rates depend on asset allocation, time horizon, and market conditions.",
  },
  marginal_rate: {
    term: "Marginal Tax Rate",
    definition: "The tax rate applied to the last dollar of taxable income — the rate on income in the highest bracket reached.",
    why: "Planning decisions (Roth conversions, gain harvesting) should target the marginal rate, not the effective rate.",
  },
  effective_rate: {
    term: "Effective Tax Rate",
    definition: "Total tax divided by total taxable income — the blended average rate across all brackets.",
    why: "Useful for comparing overall tax burden year-over-year and across clients.",
  },
  capital_gains: {
    term: "Capital Gains",
    definition: "Profit from selling an investment for more than its purchase price. Long-term gains (held > 1 year) are taxed at preferential rates (0%, 15%, or 20%).",
    why: "Managing gain realization timing and harvesting losses against gains is central to tax planning.",
  },
  step_up_basis: {
    term: "Step-Up in Basis",
    definition: "When an heir inherits an asset, its cost basis resets to fair market value at the date of death, eliminating unrealized capital gains.",
    why: "Makes holding appreciated assets until death a powerful estate-planning strategy.",
  },
  unified_credit: {
    term: "Unified Credit / Exemption",
    definition: "The combined gift and estate tax exemption ($13.61M per person in 2024), which shields transfers from federal gift and estate tax.",
    why: "The exemption is scheduled to sunset to ~$7M in 2026, creating urgency for high-net-worth estate planning.",
  },
  generation_skipping: {
    term: "GST Tax",
    definition: "Generation-Skipping Transfer Tax — a federal tax on transfers to beneficiaries two or more generations below the transferor (e.g., grandchildren).",
    why: "Each person has a GST exemption equal to the estate tax exemption; proper allocation avoids a flat 40% GST tax.",
  },
  fiduciary: {
    term: "Fiduciary Duty",
    definition: "A legal obligation to act in the client's best interest, putting their needs ahead of the advisor's own financial interests.",
    why: "Fiduciary advisors must recommend suitable strategies even if they generate lower compensation.",
  },
  aum: {
    term: "AUM",
    definition: "Assets Under Management — the total market value of investments managed on behalf of a client.",
    why: "AUM is the basis for advisory fees and is a key metric for practice management.",
  },
  beneficiary_designation: {
    term: "Beneficiary Designation",
    definition: "A legal directive on retirement accounts and insurance policies that determines who receives the assets at death, overriding a will.",
    why: "Outdated designations are a leading cause of unintended estate outcomes.",
  },
  concentrated_position: {
    term: "Concentrated Position",
    definition: "When a single stock or asset represents more than 10–15% of a client's total portfolio.",
    why: "Concentration creates outsized risk; diversification strategies (exchange funds, charitable trusts, collars) can reduce it.",
  },
  ltc: {
    term: "LTC",
    definition: "Long-Term Care — services that help people with chronic illness, disability, or cognitive impairment perform daily activities over an extended period.",
    why: "LTC costs average $100K+/year and are not covered by Medicare; planning is essential for wealth preservation.",
  },
  life_insurance_gap: {
    term: "Life Insurance Gap",
    definition: "The difference between a family's financial needs (income replacement, debts, education, final expenses) and existing coverage and assets.",
    why: "Identifying the gap ensures adequate protection without over-insuring.",
  },
  inflation_rate: {
    term: "Inflation Rate",
    definition: "The annual rate at which the general price level increases, eroding purchasing power over time.",
    why: "Retirement projections must account for inflation to avoid underestimating future spending needs.",
  },
  expected_return: {
    term: "Expected Return",
    definition: "The weighted average of probable returns for a given asset allocation, typically based on historical data and forward-looking estimates.",
    why: "Overly optimistic return assumptions can make a retirement plan appear safer than it actually is.",
  },
  rebalancing: {
    term: "Rebalancing",
    definition: "The process of realigning portfolio weights back to target allocations by selling overweight positions and buying underweight ones.",
    why: "Maintains intended risk levels and can be combined with tax-loss harvesting for added efficiency.",
  },
  dollar_cost_averaging: {
    term: "Dollar-Cost Averaging",
    definition: "Investing a fixed amount at regular intervals regardless of market price, reducing the impact of volatility on the average purchase cost.",
    why: "Smooths entry into the market and reduces the risk of investing a lump sum at a peak.",
  },
  sequence_risk: {
    term: "Sequence-of-Returns Risk",
    definition: "The risk that poor market returns early in retirement deplete the portfolio faster than expected, even if average returns over the full period are adequate.",
    why: "A retiree withdrawing during a downturn locks in losses, unlike an accumulator who benefits from buying low.",
  },
  bucket_strategy: {
    term: "Bucket Strategy",
    definition: "Dividing retirement assets into short-term (cash), mid-term (bonds), and long-term (equities) buckets to match spending needs with time horizons.",
    why: "Provides psychological comfort and reduces the need to sell equities during downturns.",
  },
};

interface InfoTipProps {
  term: string;
  className?: string;
  inline?: boolean;
}

export function InfoTip({ term, className = "", inline = false }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entry = GLOSSARY[term.toLowerCase()];

  const show = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        tipRef.current && !tipRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  if (!entry) return null;

  const id = `infotip-${term.toLowerCase()}`;

  return (
    <span className={`relative ${inline ? "inline-flex" : "inline-flex"} items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Learn about ${entry.term}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        data-testid={`infotip-trigger-${term.toLowerCase()}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute z-50 left-6 top-0 w-72 p-3 rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
          data-testid={`infotip-content-${term.toLowerCase()}`}
        >
          <div className="text-xs font-semibold mb-1">{entry.term}</div>
          <p className="text-[11px] leading-relaxed text-muted-foreground mb-2">{entry.definition}</p>
          <div className="text-[10px] leading-relaxed px-2 py-1.5 rounded bg-muted/50 text-muted-foreground">
            <span className="font-semibold text-foreground/70">Why it matters:</span> {entry.why}
          </div>
        </div>
      )}
    </span>
  );
}

export function getGlossaryTerms(): string[] {
  return Object.keys(GLOSSARY);
}
