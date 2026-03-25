import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "./middleware";
import { validateBody, validateParams } from "../lib/validation";
import { logger } from "../lib/logger";
import { sanitizeErrorMessage } from "../lib/error-utils";
import { db } from "../db";
import { calculatorRuns } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateRMD, calculateAggregatedRMD, analyzeQCD, projectRMD, compareStrategies, type RMDInput, type AggregatedRMDInput, type QCDAnalysisInput, type RMDProjectionInput, type StrategyComparisonInput } from "../calculators/rmd-calculator";
import { calculateBudget, type BudgetInput } from "../calculators/budget-calculator";
import { calculateRothConversion, projectMultiYearConversion, compareConversionScenarios, getConversionAmountToMaximizeBracket, validateRothConversionInput, type RothConversionInput, type MultiYearConversionInput, type ScenarioComparisonInput, type BracketOptimizerInput } from "../calculators/roth-conversion-calculator";
import { calculateAssetLocation, type AssetLocationInput } from "../calculators/asset-location-calculator";
import { calculateTaxBracket, type TaxBracketInput } from "../calculators/tax-bracket-calculator";
import { calculateQSBS, type QSBSInput } from "../calculators/qsbs-tracker-calculator";
import { calculateConcentratedStock, type ConcentratedStockInput } from "../calculators/concentrated-stock-calculator";
import { calculateLTCPlanning, type LTCPlanningInput } from "../calculators/ltc-planning-calculator";
import { calculateLifeInsuranceGap, type LifeInsuranceGapInput } from "../calculators/life-insurance-gap-calculator";
import { calculateRetirementAnalysis, type RetirementAnalysisInput } from "../calculators/retirement-analysis-calculator";

const rmdBodySchema = z.object({
  accountHolderDOB: z.string().min(1, "accountHolderDOB is required"),
  accountBalance: z.coerce.number().min(0, "accountBalance must be non-negative"),
  beneficiaryDOB: z.string().optional(),
  beneficiaryRelationship: z.enum(["spouse", "non_spouse", "none"]).optional(),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1).optional(),
  inheritanceStatus: z.enum(["original_owner", "inherited_ira", "post_secure_act"]).optional(),
  projectionYears: z.coerce.number().int().min(1).max(50).optional(),
  clientId: z.string().optional(),
  qcdAmount: z.coerce.number().min(0).optional(),
  qcdAnnualIncrease: z.coerce.number().min(0).max(1).optional(),
  marginalTaxRate: z.coerce.number().min(0).max(1).optional(),
});

const scenarioSchema = z.object({
  growthRate: z.coerce.number().min(-1).max(1),
  inflationRate: z.coerce.number().min(-1).max(1),
});

const budgetBodySchema = z.object({
  mode: z.enum(["pre_retirement", "post_retirement"]),
  currentAge: z.coerce.number().int().min(0).max(150),
  retirementAge: z.coerce.number().int().min(0).max(150).optional(),
  currentIncome: z.coerce.number().min(0).optional(),
  annualSavingsAmount: z.coerce.number().min(0).optional(),
  currentSavings: z.coerce.number().min(0).optional(),
  portfolioBalance: z.coerce.number().min(0).optional(),
  retirementIncome: z.object({
    socialSecurity: z.coerce.number().min(0),
    pension: z.coerce.number().min(0),
    dividends: z.coerce.number().min(0),
  }).optional(),
  expenses: z.record(z.string(), z.coerce.number()),
  projectionYears: z.coerce.number().int().min(1).max(100).optional(),
  scenarios: z.object({
    base: scenarioSchema,
    optimistic: scenarioSchema,
    conservative: scenarioSchema,
  }),
  clientId: z.string().optional(),
}).passthrough();

const rothConversionBodySchema = z.object({
  currentAge: z.coerce.number().int().min(18).max(100),
  retirementAge: z.coerce.number().int().min(50).max(100),
  traditionalIRABalance: z.coerce.number().min(0),
  rothIRABalance: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  expectedRetirementRate: z.coerce.number().min(0).max(0.50),
  conversionAmount: z.coerce.number().min(0),
  projectionYears: z.coerce.number().int().min(1).max(40).optional(),
  expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).optional(),
  nonDeductibleIRABalance: z.coerce.number().min(0).optional(),
  state: z.string().min(2).max(2).optional(),
  clientId: z.string().optional(),
});

const assetLocationBodySchema = z.object({
  holdings: z.array(z.object({
    name: z.string(),
    ticker: z.string(),
    marketValue: z.coerce.number().min(0),
    assetClass: z.string(),
    currentAccountType: z.enum(["taxable", "traditional", "roth"]),
    expectedReturn: z.coerce.number(),
    dividendYield: z.coerce.number().min(0),
    turnoverRate: z.coerce.number().min(0).max(1),
    taxEfficiency: z.enum(["high", "medium", "low"]),
  })),
  taxableCapacity: z.coerce.number().min(0),
  traditionalCapacity: z.coerce.number().min(0),
  rothCapacity: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(0.50),
  capitalGainsTaxRate: z.coerce.number().min(0).max(0.30),
  investmentHorizon: z.coerce.number().int().min(1).max(50),
  clientId: z.string().optional(),
});

const taxBracketBodySchema = z.object({
  grossIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  deductions: z.coerce.number().min(0),
  additionalIncome: z.coerce.number().min(0),
  stateRate: z.coerce.number().min(0).max(0.15),
  projectionYears: z.coerce.number().int().min(1).max(30).optional(),
  expectedIncomeGrowth: z.coerce.number().min(-0.10).max(0.20).optional(),
  expectedBracketInflation: z.coerce.number().min(0).max(0.10).optional(),
  clientId: z.string().optional(),
});

const qsbsBodySchema = z.object({
  positions: z.array(z.object({
    companyName: z.string().min(1),
    sharesOwned: z.coerce.number().min(0),
    costBasis: z.coerce.number().min(0),
    currentValue: z.coerce.number().min(0),
    acquisitionDate: z.string().min(1),
    isOriginalIssue: z.boolean(),
    companyGrossAssets: z.enum(["under_50m", "over_50m", "unknown"]),
    isCCorporation: z.boolean(),
    qualifiedTradeOrBusiness: z.boolean(),
  })),
  analysisDate: z.string().optional(),
  clientId: z.string().optional(),
});

const concentratedStockBodySchema = z.object({
  stockName: z.string().min(1),
  sharesOwned: z.coerce.number().min(1),
  currentPrice: z.coerce.number().min(0.01),
  costBasisPerShare: z.coerce.number().min(0),
  holdingPeriodMonths: z.coerce.number().int().min(0),
  totalPortfolioValue: z.coerce.number().min(0),
  targetAllocationPercent: z.coerce.number().min(0).max(100),
  annualDividendYield: z.coerce.number().min(0).max(1).optional(),
  expectedAnnualReturn: z.coerce.number().min(-0.5).max(0.5).optional(),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  ordinaryIncomeRate: z.coerce.number().min(0).max(0.5).optional(),
  stateCapGainsRate: z.coerce.number().min(0).max(0.15).optional(),
  sellYears: z.coerce.number().int().min(1).max(10).optional(),
  clientId: z.string().optional(),
});

const ltcPlanningBodySchema = z.object({
  clientAge: z.coerce.number().int().min(30).max(100),
  gender: z.enum(["male", "female"]),
  healthStatus: z.enum(["excellent", "good", "fair", "poor"]),
  liquidAssets: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  annualExpenses: z.coerce.number().min(0),
  existingLTCCoverage: z.coerce.number().min(0).optional(),
  spouseAge: z.coerce.number().int().min(20).max(100).optional(),
  spouseIncome: z.coerce.number().min(0).optional(),
  stateOfResidence: z.string().optional(),
  carePreference: z.enum(["nursing_home", "assisted_living", "home_care", "blended"]),
  projectionYears: z.coerce.number().int().min(1).max(50).optional(),
  clientId: z.string().optional(),
});

const lifeInsuranceGapBodySchema = z.object({
  annualIncome: z.coerce.number().min(0),
  spouseIncome: z.coerce.number().min(0).optional(),
  dependents: z.coerce.number().int().min(0).max(20),
  youngestDependentAge: z.coerce.number().int().min(0).max(30).optional(),
  mortgageBalance: z.coerce.number().min(0).optional(),
  otherDebts: z.coerce.number().min(0).optional(),
  educationFundingGoal: z.enum(["public", "private", "none"]),
  childrenNeedingEducation: z.coerce.number().int().min(0).max(20).optional(),
  averageChildAge: z.coerce.number().int().min(0).max(25).optional(),
  existingLifeInsurance: z.coerce.number().min(0).optional(),
  existingGroupCoverage: z.coerce.number().min(0).optional(),
  liquidSavings: z.coerce.number().min(0).optional(),
  retirementAssets: z.coerce.number().min(0).optional(),
  annualExpenses: z.coerce.number().min(0).optional(),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  yearsOfIncomeReplacement: z.coerce.number().int().min(1).max(50).optional(),
  funeralAndFinalExpenses: z.coerce.number().min(0).optional(),
  estateSize: z.coerce.number().min(0).optional(),
  estateTaxExemption: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
});

const multiYearRothBodySchema = z.object({
  currentAge: z.coerce.number().int().min(18).max(100),
  retirementAge: z.coerce.number().int().min(50).max(100),
  traditionalIRABalance: z.coerce.number().min(0),
  rothIRABalance: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  expectedRetirementRate: z.coerce.number().min(0).max(0.50),
  annualConversionAmount: z.coerce.number().min(0),
  conversionYears: z.coerce.number().int().min(1).max(30),
  projectionYears: z.coerce.number().int().min(1).max(40).optional(),
  expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).optional(),
  clientId: z.string().optional(),
});

const rothScenarioComparisonBodySchema = z.object({
  currentAge: z.coerce.number().int().min(18).max(100),
  retirementAge: z.coerce.number().int().min(50).max(100),
  traditionalIRABalance: z.coerce.number().min(0),
  rothIRABalance: z.coerce.number().min(0),
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  expectedRetirementRate: z.coerce.number().min(0).max(0.50),
  conversionAmounts: z.array(z.coerce.number().min(0)).min(2).max(10),
  projectionYears: z.coerce.number().int().min(1).max(40).optional(),
  expectedGrowthRate: z.coerce.number().min(-0.10).max(0.20).optional(),
  clientId: z.string().optional(),
});

const bracketOptimizerBodySchema = z.object({
  annualIncome: z.coerce.number().min(0),
  filingStatus: z.enum(["single", "married_filing_jointly"]),
  stateRate: z.coerce.number().min(0).max(0.15),
  traditionalIRABalance: z.coerce.number().min(0),
  clientId: z.string().optional(),
});

const qcdAnalysisBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  proposedQCDAmount: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(1),
  standardDeduction: z.coerce.number().min(0).optional(),
  itemizedDeductions: z.coerce.number().min(0).optional(),
  clientId: z.string().optional(),
});

const rmdProjectionBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1),
  projectionYears: z.coerce.number().int().min(1).max(50),
  clientId: z.string().optional(),
});

const aggregatedRmdBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  accounts: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["traditional_ira", "401k", "403b", "457b", "sep_ira", "simple_ira"]),
    balance: z.coerce.number().min(0),
  })).min(1),
  clientId: z.string().optional(),
});

const strategyComparisonBodySchema = z.object({
  accountHolderDOB: z.string().min(1),
  accountBalance: z.coerce.number().min(0),
  taxYear: z.coerce.number().int().min(2000).max(2100),
  assumedGrowthRate: z.coerce.number().min(-1).max(1),
  projectionYears: z.coerce.number().int().min(1).max(50),
  qcdAmount: z.coerce.number().min(0),
  marginalTaxRate: z.coerce.number().min(0).max(1),
  clientId: z.string().optional(),
});

const runIdParamsSchema = z.object({
  runId: z.string().min(1, "runId is required"),
});

export function registerCalculatorRoutes(app: Express) {
  app.post("/api/calculators/rmd", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(rmdBodySchema, req, res);
      if (!data) return;

      const inputs: RMDInput = {
        accountHolderDOB: data.accountHolderDOB,
        accountBalance: data.accountBalance,
        beneficiaryDOB: data.beneficiaryDOB || undefined,
        beneficiaryRelationship: data.beneficiaryRelationship || "none",
        taxYear: data.taxYear,
        assumedGrowthRate: data.assumedGrowthRate !== undefined ? data.assumedGrowthRate : 0.07,
        inheritanceStatus: data.inheritanceStatus || "original_owner",
        projectionYears: data.projectionYears || 10,
        qcdAmount: data.qcdAmount,
        qcdAnnualIncrease: data.qcdAnnualIncrease,
        marginalTaxRate: data.marginalTaxRate,
      };

      const results = calculateRMD(inputs);

      const assumptions = {
        mortalityTableUsed: "IRS Uniform Lifetime Table III",
        withdrawalTiming: "by December 31",
        inflationAssumption: null,
      };

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "rmd",
          clientId: data.clientId || null,
          advisorId: advisorId!,
          inputs,
          results,
          assumptions,
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({
        id: run.id,
        calculatorType: "rmd",
        inputs,
        results,
        assumptions,
        createdAt: run.createdAt,
      });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/rmd error");
      res.status(400).json({ error: "Failed to calculate RMD" });
    }
  });

  app.post("/api/calculators/budget", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(budgetBodySchema, req, res);
      if (!data) return;

      const { mode, expenses, scenarios, projectionYears, clientId, ...otherInputs } = data;

      const inputs: BudgetInput = {
        mode,
        expenses,
        scenarios,
        projectionYears: projectionYears || 30,
        clientId: clientId || undefined,
        ...otherInputs,
      };

      const results = calculateBudget(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "budget",
          clientId: clientId || null,
          advisorId: advisorId!,
          inputs,
          results,
          assumptions: {
            projectionYears: projectionYears || 30,
            scenarioRates: scenarios,
            healthcareInflationRate: 0.04,
          },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({
        id: run.id,
        calculatorType: "budget",
        inputs,
        results,
        assumptions: run.assumptions,
        createdAt: run.createdAt,
      });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/budget error");
      res.status(400).json({ error: "Failed to calculate budget" });
    }
  });

  app.post("/api/calculators/roth-conversion", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(rothConversionBodySchema, req, res);
      if (!data) return;

      const inputs: RothConversionInput = {
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        traditionalIRABalance: data.traditionalIRABalance,
        rothIRABalance: data.rothIRABalance,
        annualIncome: data.annualIncome,
        filingStatus: data.filingStatus,
        stateRate: data.stateRate,
        expectedRetirementRate: data.expectedRetirementRate,
        conversionAmount: data.conversionAmount,
        projectionYears: data.projectionYears || 20,
        expectedGrowthRate: data.expectedGrowthRate ?? 0.07,
        ...(data.nonDeductibleIRABalance !== undefined && { nonDeductibleIRABalance: data.nonDeductibleIRABalance }),
        ...(data.state !== undefined && { state: data.state }),
      };

      const validationErrors = validateRothConversionInput(inputs);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: validationErrors });
      }

      const results = calculateRothConversion(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "roth_conversion",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal", stateRate: data.stateRate },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "roth_conversion", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/roth-conversion error");
      res.status(400).json({ error: "Failed to calculate Roth conversion" });
    }
  });

  app.post("/api/calculators/asset-location", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(assetLocationBodySchema, req, res);
      if (!data) return;

      const inputs: AssetLocationInput = {
        holdings: data.holdings,
        taxableCapacity: data.taxableCapacity,
        traditionalCapacity: data.traditionalCapacity,
        rothCapacity: data.rothCapacity,
        marginalTaxRate: data.marginalTaxRate,
        capitalGainsTaxRate: data.capitalGainsTaxRate,
        investmentHorizon: data.investmentHorizon,
      };
      const results = calculateAssetLocation(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "asset_location",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { marginalTaxRate: data.marginalTaxRate, capitalGainsTaxRate: data.capitalGainsTaxRate, investmentHorizon: data.investmentHorizon },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "asset_location", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/asset-location error");
      res.status(400).json({ error: "Failed to calculate asset location" });
    }
  });

  app.post("/api/calculators/tax-bracket", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(taxBracketBodySchema, req, res);
      if (!data) return;

      const inputs: TaxBracketInput = {
        grossIncome: data.grossIncome,
        filingStatus: data.filingStatus,
        deductions: data.deductions,
        additionalIncome: data.additionalIncome,
        stateRate: data.stateRate,
        projectionYears: data.projectionYears || 10,
        expectedIncomeGrowth: data.expectedIncomeGrowth ?? 0.03,
        expectedBracketInflation: data.expectedBracketInflation ?? 0.02,
      };

      const results = calculateTaxBracket(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "tax_bracket",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal", standardDeductionApplied: data.deductions === 0 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "tax_bracket", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/tax-bracket error");
      res.status(400).json({ error: "Failed to calculate tax bracket" });
    }
  });

  app.post("/api/calculators/qsbs", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(qsbsBodySchema, req, res);
      if (!data) return;

      const inputs: QSBSInput = {
        positions: data.positions,
        analysisDate: data.analysisDate,
      };
      const results = calculateQSBS(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "qsbs",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { section1202ExclusionRate: 1.0, combinedCapGainsRate: 0.238 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "qsbs", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/qsbs error");
      res.status(400).json({ error: "Failed to calculate QSBS" });
    }
  });

  app.post("/api/calculators/concentrated-stock", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(concentratedStockBodySchema, req, res);
      if (!data) return;

      const inputs: ConcentratedStockInput = {
        stockName: data.stockName,
        sharesOwned: data.sharesOwned,
        currentPrice: data.currentPrice,
        costBasisPerShare: data.costBasisPerShare,
        holdingPeriodMonths: data.holdingPeriodMonths,
        totalPortfolioValue: data.totalPortfolioValue,
        targetAllocationPercent: data.targetAllocationPercent,
        annualDividendYield: data.annualDividendYield,
        expectedAnnualReturn: data.expectedAnnualReturn ?? 0.08,
        filingStatus: data.filingStatus,
        ordinaryIncomeRate: data.ordinaryIncomeRate,
        stateCapGainsRate: data.stateCapGainsRate ?? 0,
        sellYears: data.sellYears ?? 3,
      };
      const results = calculateConcentratedStock(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "concentrated_stock",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { longTermCapGainsRate: 0.238, stateRate: data.stateCapGainsRate ?? 0 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "concentrated_stock", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/concentrated-stock error");
      res.status(400).json({ error: "Failed to calculate concentrated stock analysis" });
    }
  });

  app.post("/api/calculators/ltc-planning", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(ltcPlanningBodySchema, req, res);
      if (!data) return;

      const inputs: LTCPlanningInput = {
        clientAge: data.clientAge,
        gender: data.gender,
        healthStatus: data.healthStatus,
        liquidAssets: data.liquidAssets,
        annualIncome: data.annualIncome,
        annualExpenses: data.annualExpenses,
        existingLTCCoverage: data.existingLTCCoverage,
        spouseAge: data.spouseAge,
        spouseIncome: data.spouseIncome,
        stateOfResidence: data.stateOfResidence,
        carePreference: data.carePreference,
        projectionYears: data.projectionYears ?? 30,
      };
      const results = calculateLTCPlanning(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "ltc_planning",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { ltcCostInflation: 0.04, investmentReturn: 0.06, averageDuration: 3.0 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "ltc_planning", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/ltc-planning error");
      res.status(400).json({ error: "Failed to calculate LTC planning analysis" });
    }
  });

  app.post("/api/calculators/life-insurance-gap", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(lifeInsuranceGapBodySchema, req, res);
      if (!data) return;

      const inputs: LifeInsuranceGapInput = {
        annualIncome: data.annualIncome,
        spouseIncome: data.spouseIncome,
        dependents: data.dependents,
        youngestDependentAge: data.youngestDependentAge,
        mortgageBalance: data.mortgageBalance,
        otherDebts: data.otherDebts,
        educationFundingGoal: data.educationFundingGoal,
        childrenNeedingEducation: data.childrenNeedingEducation,
        averageChildAge: data.averageChildAge,
        existingLifeInsurance: data.existingLifeInsurance,
        existingGroupCoverage: data.existingGroupCoverage,
        liquidSavings: data.liquidSavings,
        retirementAssets: data.retirementAssets,
        annualExpenses: data.annualExpenses,
        filingStatus: data.filingStatus,
        yearsOfIncomeReplacement: data.yearsOfIncomeReplacement,
        funeralAndFinalExpenses: data.funeralAndFinalExpenses,
        estateSize: data.estateSize,
        estateTaxExemption: data.estateTaxExemption,
      };
      const results = calculateLifeInsuranceGap(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "life_insurance_gap",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { discountRate: 0.05, incomeGrowthRate: 0.03, educationInflation: 0.05 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "life_insurance_gap", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/life-insurance-gap error");
      res.status(400).json({ error: "Failed to calculate life insurance gap analysis" });
    }
  });

  app.post("/api/calculators/roth/multi-year", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(multiYearRothBodySchema, req, res);
      if (!data) return;

      const inputs: MultiYearConversionInput = {
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        traditionalIRABalance: data.traditionalIRABalance,
        rothIRABalance: data.rothIRABalance,
        annualIncome: data.annualIncome,
        filingStatus: data.filingStatus,
        stateRate: data.stateRate,
        expectedRetirementRate: data.expectedRetirementRate,
        annualConversionAmount: data.annualConversionAmount,
        conversionYears: data.conversionYears,
        projectionYears: data.projectionYears || 20,
        expectedGrowthRate: data.expectedGrowthRate ?? 0.07,
      };
      const results = projectMultiYearConversion(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "roth_multi_year",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal", stateRate: data.stateRate },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "roth_multi_year", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/roth/multi-year error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to calculate multi-year Roth conversion") });
    }
  });

  app.post("/api/calculators/roth/compare-scenarios", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(rothScenarioComparisonBodySchema, req, res);
      if (!data) return;

      const inputs: ScenarioComparisonInput = {
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        traditionalIRABalance: data.traditionalIRABalance,
        rothIRABalance: data.rothIRABalance,
        annualIncome: data.annualIncome,
        filingStatus: data.filingStatus,
        stateRate: data.stateRate,
        expectedRetirementRate: data.expectedRetirementRate,
        conversionAmounts: data.conversionAmounts,
        projectionYears: data.projectionYears || 20,
        expectedGrowthRate: data.expectedGrowthRate ?? 0.07,
      };
      const results = compareConversionScenarios(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "roth_scenario_comparison",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal" },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "roth_scenario_comparison", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/roth/compare-scenarios error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to compare Roth conversion scenarios") });
    }
  });

  app.post("/api/calculators/roth/bracket-optimizer", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(bracketOptimizerBodySchema, req, res);
      if (!data) return;

      const inputs: BracketOptimizerInput = {
        annualIncome: data.annualIncome,
        filingStatus: data.filingStatus,
        stateRate: data.stateRate,
        traditionalIRABalance: data.traditionalIRABalance,
      };
      const results = getConversionAmountToMaximizeBracket(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "roth_bracket_optimizer",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { taxYear: 2024, bracketsUsed: "2024 Federal" },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "roth_bracket_optimizer", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/roth/bracket-optimizer error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to optimize bracket") });
    }
  });

  app.post("/api/calculators/rmd/qcd-analysis", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(qcdAnalysisBodySchema, req, res);
      if (!data) return;

      const inputs: QCDAnalysisInput = {
        accountHolderDOB: data.accountHolderDOB,
        accountBalance: data.accountBalance,
        taxYear: data.taxYear,
        proposedQCDAmount: data.proposedQCDAmount,
        marginalTaxRate: data.marginalTaxRate,
        standardDeduction: data.standardDeduction,
        itemizedDeductions: data.itemizedDeductions,
      };
      const results = analyzeQCD(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "rmd_qcd_analysis",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { qcdMaxAnnual: 105000, qcdMinAge: 70.5 },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "rmd_qcd_analysis", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/rmd/qcd-analysis error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to analyze QCD") });
    }
  });

  app.post("/api/calculators/rmd/projection", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(rmdProjectionBodySchema, req, res);
      if (!data) return;

      const inputs: RMDProjectionInput = {
        accountHolderDOB: data.accountHolderDOB,
        accountBalance: data.accountBalance,
        taxYear: data.taxYear,
        assumedGrowthRate: data.assumedGrowthRate,
        projectionYears: data.projectionYears,
      };
      const results = projectRMD(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "rmd_projection",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III" },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "rmd_projection", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/rmd/projection error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to project RMD") });
    }
  });

  app.post("/api/calculators/rmd/aggregated", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(aggregatedRmdBodySchema, req, res);
      if (!data) return;

      const inputs: AggregatedRMDInput = {
        accountHolderDOB: data.accountHolderDOB,
        taxYear: data.taxYear,
        accounts: data.accounts,
      };
      const results = calculateAggregatedRMD(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "rmd_aggregated",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III", aggregationRules: "IRA aggregated, employer plans separate" },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "rmd_aggregated", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/rmd/aggregated error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to calculate aggregated RMD") });
    }
  });

  app.post("/api/calculators/rmd/compare-strategies", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(strategyComparisonBodySchema, req, res);
      if (!data) return;

      const inputs: StrategyComparisonInput = {
        accountHolderDOB: data.accountHolderDOB,
        accountBalance: data.accountBalance,
        taxYear: data.taxYear,
        assumedGrowthRate: data.assumedGrowthRate,
        projectionYears: data.projectionYears,
        qcdAmount: data.qcdAmount,
        marginalTaxRate: data.marginalTaxRate,
      };
      const results = compareStrategies(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "rmd_strategy_comparison",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: { mortalityTableUsed: "IRS Uniform Lifetime Table III" },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "rmd_strategy_comparison", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/rmd/compare-strategies error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to compare RMD strategies") });
    }
  });

  const retirementAnalysisBodySchema = z.object({
    currentAge: z.coerce.number().int().min(18).max(100),
    retirementAge: z.coerce.number().int().min(30).max(100),
    lifeExpectancy: z.coerce.number().int().min(50).max(120),
    portfolioValue: z.coerce.number().min(0),
    annualSpending: z.coerce.number().min(0),
    expectedReturn: z.coerce.number().min(-0.5).max(0.5),
    inflationRate: z.coerce.number().min(-0.1).max(0.2),
    preRetirementContribution: z.coerce.number().min(0),
    socialSecurityPIA: z.coerce.number().min(0).optional(),
    socialSecurityClaimingAge: z.coerce.number().int().min(62).max(70).optional(),
    spousePIA: z.coerce.number().min(0).optional(),
    spouseClaimingAge: z.coerce.number().int().min(62).max(70).optional(),
    pensionAnnualBenefit: z.coerce.number().min(0).optional(),
    pensionLumpSum: z.coerce.number().min(0).optional(),
    pensionStartAge: z.coerce.number().int().min(50).max(100).optional(),
    rentalIncome: z.coerce.number().min(0).optional(),
    rentalVacancyRate: z.coerce.number().min(0).max(1).optional(),
    filingStatus: z.enum(["single", "married_filing_jointly"]).optional(),
    traditionalBalance: z.coerce.number().min(0).optional(),
    rothBalance: z.coerce.number().min(0).optional(),
    taxableBalance: z.coerce.number().min(0).optional(),
    marginalTaxRate: z.coerce.number().min(0).max(0.5).optional(),
    stateRate: z.coerce.number().min(0).max(0.15).optional(),
    returnVolatility: z.coerce.number().min(0).max(1).optional(),
    clientId: z.string().optional(),
  }).refine(data => data.retirementAge > data.currentAge, {
    message: "Retirement age must be greater than current age",
    path: ["retirementAge"],
  }).refine(data => data.lifeExpectancy >= data.retirementAge, {
    message: "Life expectancy must be at least retirement age",
    path: ["lifeExpectancy"],
  });

  app.post("/api/calculators/retirement-analysis", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const data = validateBody(retirementAnalysisBodySchema, req, res);
      if (!data) return;

      const inputs: RetirementAnalysisInput = {
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        lifeExpectancy: data.lifeExpectancy,
        portfolioValue: data.portfolioValue,
        annualSpending: data.annualSpending,
        expectedReturn: data.expectedReturn,
        inflationRate: data.inflationRate,
        preRetirementContribution: data.preRetirementContribution,
        socialSecurityPIA: data.socialSecurityPIA,
        socialSecurityClaimingAge: data.socialSecurityClaimingAge,
        spousePIA: data.spousePIA,
        spouseClaimingAge: data.spouseClaimingAge,
        pensionAnnualBenefit: data.pensionAnnualBenefit,
        pensionLumpSum: data.pensionLumpSum,
        pensionStartAge: data.pensionStartAge,
        rentalIncome: data.rentalIncome,
        rentalVacancyRate: data.rentalVacancyRate,
        filingStatus: data.filingStatus,
        traditionalBalance: data.traditionalBalance,
        rothBalance: data.rothBalance,
        taxableBalance: data.taxableBalance,
        marginalTaxRate: data.marginalTaxRate,
        stateRate: data.stateRate,
        returnVolatility: data.returnVolatility,
      };

      const results = calculateRetirementAnalysis(inputs);

      const [run] = await db
        .insert(calculatorRuns)
        .values({
          calculatorType: "retirement_analysis",
          clientId: data.clientId || null,
          advisorId,
          inputs,
          results,
          assumptions: {
            scenarioCount: 5,
            ssClaimingRange: "62-70",
            expensePhases: "go-go/slow-go/no-go",
            healthcareInflation: "5%",
            monteCarloSims: 500,
          },
          createdBy: advisorId,
        })
        .returning();

      res.status(201).json({ id: run.id, calculatorType: "retirement_analysis", inputs, results, createdAt: run.createdAt });
    } catch (err: any) {
      logger.error({ err }, "POST /api/calculators/retirement-analysis error");
      res.status(400).json({ error: sanitizeErrorMessage(err, "Failed to run retirement analysis") });
    }
  });

  app.get("/api/calculators/runs", requireAuth, async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const clientId = req.query.clientId as string;
      const calculatorType = req.query.calculatorType as string;

      let conditions = [eq(calculatorRuns.advisorId, advisorId)];
      if (clientId) conditions.push(eq(calculatorRuns.clientId, clientId as string));
      if (calculatorType) conditions.push(eq(calculatorRuns.calculatorType, calculatorType as string));

      const runs = await db
        .select()
        .from(calculatorRuns)
        .where(and(...conditions))
        .orderBy(desc(calculatorRuns.createdAt))
        .limit(50);

      res.json(runs);
    } catch (err) {
      logger.error({ err }, "GET /api/calculators/runs error");
      res.status(500).json({ error: "Failed to fetch calculator runs" });
    }
  });

  app.get("/api/calculators/runs/:runId", requireAuth, validateParams(runIdParamsSchema), async (req, res) => {
    try {
      const advisorId = req.session.userId!;
      const runId = req.params.runId as string;

      const [run] = await db
        .select()
        .from(calculatorRuns)
        .where(and(eq(calculatorRuns.id, runId), eq(calculatorRuns.advisorId, advisorId)));

      if (!run) return res.status(404).json({ error: "Calculator run not found" });
      res.json(run);
    } catch (err) {
      logger.error({ err }, "GET /api/calculators/runs/:runId error");
      res.status(500).json({ error: "Failed to fetch calculator run" });
    }
  });
}
