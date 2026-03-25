const TOOL_ROUTE_MAP: Record<string, { route: string; label: string }> = {
  rmd: { route: "/calculators/rmd", label: "RMD Calculator" },
  rmd_calculator: { route: "/calculators/rmd", label: "RMD Calculator" },
  budget: { route: "/calculators/budget", label: "Budget Calculator" },
  budget_calculator: { route: "/calculators/budget", label: "Budget Calculator" },
  roth_conversion: { route: "/tax-strategy/roth-conversion", label: "Roth Conversion Analyzer" },
  roth: { route: "/tax-strategy/roth-conversion", label: "Roth Conversion Analyzer" },
  asset_location: { route: "/tax-strategy/asset-location", label: "Asset Location Optimizer" },
  tax_bracket: { route: "/tax-strategy/tax-brackets", label: "Tax Bracket Projection" },
  tax_brackets: { route: "/tax-strategy/tax-brackets", label: "Tax Bracket Projection" },
  qsbs: { route: "/tax-strategy/qsbs", label: "QSBS Tracker" },
  qsbs_tracker: { route: "/tax-strategy/qsbs", label: "QSBS Tracker" },
  tax_strategy: { route: "/tax-strategy", label: "Tax Strategy Hub" },
  qcd: { route: "/calculators/rmd", label: "QCD Modeling (via RMD Calculator)" },
};

const INFORMATIONAL_TOOLS: Record<string, string> = {
  estate_checklist: "Estate Planning checklist",
  charitable_giving: "Charitable Giving strategy",
  asset_allocation: "Asset Allocation review",
  retirement_income: "Retirement Income planning",
};

function normalizeToolList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    return [raw];
  }
  return [];
}

export async function validate(signal: any, _advisorId: string) {
  if (!signal) {
    return { valid: false, error: "No signal payload provided" };
  }
  return { valid: true };
}

export async function execute(signal: any, _advisorId: string) {
  const recommendedTools = normalizeToolList(
    signal.recommendedTools ?? signal.recommended_tools ?? signal.planningTools
  );

  const navigations: { tool: string; route: string; label: string }[] = [];
  const informational: { tool: string; description: string }[] = [];

  for (const tool of recommendedTools) {
    const normalized = tool.toLowerCase().trim();
    const mapped = TOOL_ROUTE_MAP[normalized];
    if (mapped) {
      navigations.push({ tool, route: mapped.route, label: mapped.label });
    } else {
      const info = INFORMATIONAL_TOOLS[normalized];
      informational.push({
        tool,
        description: info
          ? `${info} is recommended but not yet available as an interactive tool. Consider discussing this with the client during the next review.`
          : `"${tool}" planning tool is not yet available. Consider adding it to the client's planning notes for manual follow-up.`,
      });
    }
  }

  if (recommendedTools.length === 0) {
    return {
      success: true,
      action_taken: "planning_triage",
      message: "Planning triage completed. No specific tools were recommended for this signal.",
      recommendations: [],
    };
  }

  const recommendations = [
    ...navigations.map((n) => ({
      type: "navigation" as const,
      tool: n.tool,
      label: n.label,
      route: n.route,
    })),
    ...informational.map((i) => ({
      type: "informational" as const,
      tool: i.tool,
      description: i.description,
    })),
  ];

  const navigation =
    navigations.length > 0 ? navigations[0].route : undefined;

  return {
    success: true,
    action_taken: "planning_triage",
    navigation,
    message:
      navigations.length > 0
        ? `Planning triage identified ${navigations.length} available tool(s): ${navigations.map((n) => n.label).join(", ")}.${informational.length > 0 ? ` ${informational.length} additional tool(s) noted for future follow-up.` : ""}`
        : `Planning triage completed. ${informational.length} recommended tool(s) are not yet available as interactive tools. See recommendations for manual follow-up guidance.`,
    recommendations,
  };
}
