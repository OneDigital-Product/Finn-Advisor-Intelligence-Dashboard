import type { Client, OfacSdnEntry, PepEntry } from "@shared/schema";

export interface RiskFactors {
  residencyRisk: number;
  occupationRisk: number;
  sourceOfWealthRisk: number;
  pepRisk: number;
  screeningRisk: number;
  details: Record<string, any>;
}

export interface RiskRatingResult {
  riskScore: number;
  riskTier: "low" | "standard" | "high" | "prohibited";
  factors: RiskFactors;
}

const HIGH_RISK_COUNTRIES = [
  "iran", "north korea", "syria", "myanmar", "cuba", "russia",
  "afghanistan", "yemen", "libya", "somalia", "south sudan", "venezuela",
];

const ELEVATED_RISK_COUNTRIES = [
  "china", "nigeria", "pakistan", "bangladesh", "ukraine",
  "cambodia", "panama", "cayman islands", "british virgin islands",
];

const HIGH_RISK_OCCUPATIONS = [
  "politician", "government official", "diplomat", "military officer",
  "arms dealer", "casino operator", "money service business",
  "precious metals dealer", "art dealer", "cryptocurrency exchange operator",
];

const ELEVATED_RISK_OCCUPATIONS = [
  "real estate agent", "lawyer", "accountant", "car dealer",
  "jeweler", "pawnbroker", "import/export", "nonprofit director",
];

const RISK_WEIGHTS = {
  residency: 0.20,
  occupation: 0.15,
  sourceOfWealth: 0.20,
  pep: 0.20,
  screening: 0.25,
};

export interface ScreeningMatch {
  watchlistName: string;
  matchConfidence: number;
  matchDetails: { reason: string; matchedName: string; clientName: string; sdnType?: string; program?: string; entryId?: string };
}

export interface CompositeScreeningResult {
  matches: ScreeningMatch[];
  highestConfidence: number;
  screeningRiskScore: number;
  requiresManualReview: boolean;
  autoResolved: ScreeningMatch[];
}

export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const maxDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (maxDist < 0) return 0.0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateNameVariants(firstName: string, lastName: string): string[] {
  const full = `${firstName} ${lastName}`;
  const variants = [
    full,
    `${lastName} ${firstName}`,
    `${lastName}, ${firstName}`,
    firstName,
    lastName,
  ];

  if (firstName.length > 1) {
    variants.push(`${firstName[0]}. ${lastName}`);
    variants.push(`${firstName[0]} ${lastName}`);
  }

  return variants.map(normalizeNameForComparison).filter(v => v.length > 0);
}

export function calculateNameSimilarity(clientName: string, watchlistName: string): number {
  const normClient = normalizeNameForComparison(clientName);
  const normWatchlist = normalizeNameForComparison(watchlistName);

  const fullMatch = jaroWinklerSimilarity(normClient, normWatchlist);

  const clientParts = normClient.split(/\s+/);
  const watchlistParts = normWatchlist.split(/\s+/);

  let partialScore = 0;
  let matchedParts = 0;
  const totalParts = Math.max(clientParts.length, watchlistParts.length);

  for (const cp of clientParts) {
    let bestMatch = 0;
    for (const wp of watchlistParts) {
      const sim = jaroWinklerSimilarity(cp, wp);
      bestMatch = Math.max(bestMatch, sim);
    }
    partialScore += bestMatch;
    if (bestMatch >= 0.85) matchedParts++;
  }

  const avgPartialScore = clientParts.length > 0 ? partialScore / clientParts.length : 0;
  const partsCoverage = matchedParts / totalParts;

  const combined = Math.max(
    fullMatch,
    avgPartialScore * 0.7 + partsCoverage * 0.3
  );

  return Math.round(combined * 100);
}

export function screenAgainstOfacList(
  firstName: string,
  lastName: string,
  ofacEntries: OfacSdnEntry[],
  threshold: number = 85
): ScreeningMatch[] {
  const clientVariants = generateNameVariants(firstName, lastName);
  const matches: ScreeningMatch[] = [];

  for (const entry of ofacEntries) {
    const allNames = [entry.sdnName, ...(Array.isArray(entry.aliases) ? entry.aliases as string[] : [])];
    let bestConfidence = 0;
    let bestMatchedName = entry.sdnName;

    for (const entryName of allNames) {
      for (const clientName of clientVariants) {
        const confidence = calculateNameSimilarity(clientName, entryName);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatchedName = entryName;
        }
      }
    }

    if (bestConfidence >= threshold) {
      matches.push({
        watchlistName: "OFAC SDN List",
        matchConfidence: bestConfidence,
        matchDetails: {
          reason: `OFAC SDN match - ${entry.program || "Sanctions"}`,
          matchedName: bestMatchedName,
          clientName: `${firstName} ${lastName}`,
          sdnType: entry.sdnType || undefined,
          program: entry.program || undefined,
          entryId: entry.sourceId || entry.id,
        },
      });
    }
  }

  return matches;
}

export function screenAgainstPepList(
  firstName: string,
  lastName: string,
  pepEntries: PepEntry[],
  threshold: number = 85
): ScreeningMatch[] {
  const clientVariants = generateNameVariants(firstName, lastName);
  const matches: ScreeningMatch[] = [];

  for (const entry of pepEntries) {
    const allNames = [entry.fullName, ...(Array.isArray(entry.aliases) ? entry.aliases as string[] : [])];
    let bestConfidence = 0;
    let bestMatchedName = entry.fullName;

    for (const entryName of allNames) {
      for (const clientName of clientVariants) {
        const confidence = calculateNameSimilarity(clientName, entryName);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatchedName = entryName;
        }
      }
    }

    if (bestConfidence >= threshold) {
      matches.push({
        watchlistName: "PEP Database",
        matchConfidence: bestConfidence,
        matchDetails: {
          reason: `PEP match - ${entry.position || "Politically Exposed Person"} (${entry.country || "Unknown"})`,
          matchedName: bestMatchedName,
          clientName: `${firstName} ${lastName}`,
          entryId: entry.id,
        },
      });
    }
  }

  return matches;
}

const INTERNAL_WATCHLIST = [
  { name: "John Smith", aliases: ["j. smith", "johnny smith"], reason: "Sanctions list" },
  { name: "Jane Doe", aliases: ["j. doe"], reason: "Fraud investigation" },
  { name: "Vladimir Petrov", aliases: ["v. petrov", "vlad petrov"], reason: "OFAC SDN" },
  { name: "Ahmed Hassan", aliases: ["a. hassan"], reason: "Terrorist financing" },
  { name: "Li Wei", aliases: ["l. wei"], reason: "Export control violations" },
];

export function screenAgainstInternalWatchlist(firstName: string, lastName: string, threshold: number = 60): ScreeningMatch[] {
  const clientVariants = generateNameVariants(firstName, lastName);
  const matches: ScreeningMatch[] = [];

  for (const entry of INTERNAL_WATCHLIST) {
    const allNames = [entry.name, ...entry.aliases];
    let bestConfidence = 0;

    for (const entryName of allNames) {
      for (const clientName of clientVariants) {
        const confidence = calculateNameSimilarity(clientName, entryName);
        bestConfidence = Math.max(bestConfidence, confidence);
      }
    }

    if (bestConfidence >= threshold) {
      matches.push({
        watchlistName: "Internal Watchlist",
        matchConfidence: bestConfidence,
        matchDetails: {
          reason: entry.reason,
          matchedName: entry.name,
          clientName: `${firstName} ${lastName}`,
        },
      });
    }
  }

  return matches;
}

export function screenAgainstWatchlists(firstName: string, lastName: string): ScreeningMatch[] {
  return screenAgainstInternalWatchlist(firstName, lastName);
}

export function performCompositeScreening(
  firstName: string,
  lastName: string,
  ofacEntries: OfacSdnEntry[],
  pepEntries: PepEntry[],
  config: {
    ofacEnabled: boolean;
    pepEnabled: boolean;
    internalWatchlistEnabled: boolean;
    nameMatchThreshold: number;
    autoResolveThreshold: number;
    highConfidenceThreshold: number;
  }
): CompositeScreeningResult {
  const allMatches: ScreeningMatch[] = [];
  const autoResolved: ScreeningMatch[] = [];

  const prefilterThreshold = Math.min(config.autoResolveThreshold, config.nameMatchThreshold) - 10;
  const effectivePrefilter = Math.max(prefilterThreshold, 50);

  if (config.internalWatchlistEnabled) {
    allMatches.push(...screenAgainstInternalWatchlist(firstName, lastName, effectivePrefilter));
  }

  if (config.ofacEnabled) {
    allMatches.push(...screenAgainstOfacList(firstName, lastName, ofacEntries, effectivePrefilter));
  }

  if (config.pepEnabled) {
    allMatches.push(...screenAgainstPepList(firstName, lastName, pepEntries, effectivePrefilter));
  }

  const pendingMatches: ScreeningMatch[] = [];
  for (const match of allMatches) {
    if (match.matchConfidence < config.autoResolveThreshold) {
      autoResolved.push(match);
    } else {
      pendingMatches.push(match);
    }
  }

  const highestConfidence = allMatches.length > 0
    ? Math.max(...allMatches.map(m => m.matchConfidence))
    : 0;

  let screeningRiskScore = 0;
  if (highestConfidence >= config.highConfidenceThreshold) {
    screeningRiskScore = 100;
  } else if (highestConfidence >= config.nameMatchThreshold) {
    screeningRiskScore = 70;
  } else if (highestConfidence >= config.autoResolveThreshold) {
    screeningRiskScore = 30;
  }

  const requiresManualReview = pendingMatches.some(m => m.matchConfidence >= config.highConfidenceThreshold);

  return {
    matches: pendingMatches,
    highestConfidence,
    screeningRiskScore,
    requiresManualReview,
    autoResolved,
  };
}

export function calculateRiskRating(
  client: Client,
  pepStatus: boolean = false,
  sourceOfWealth?: string,
  screeningRiskScore: number = 0
): RiskRatingResult {
  const factors: RiskFactors = {
    residencyRisk: 0,
    occupationRisk: 0,
    sourceOfWealthRisk: 0,
    pepRisk: 0,
    screeningRisk: screeningRiskScore,
    details: {},
  };

  const state = (client.state || "").toLowerCase().trim();
  const country = (client.address || "").toLowerCase();

  if (HIGH_RISK_COUNTRIES.some(c => country.includes(c))) {
    factors.residencyRisk = 100;
    factors.details.residency = "High-risk jurisdiction";
  } else if (ELEVATED_RISK_COUNTRIES.some(c => country.includes(c))) {
    factors.residencyRisk = 60;
    factors.details.residency = "Elevated-risk jurisdiction";
  } else if (!state && !country) {
    factors.residencyRisk = 30;
    factors.details.residency = "No address on file";
  } else {
    factors.residencyRisk = 10;
    factors.details.residency = "Standard jurisdiction";
  }

  const occupation = (client.occupation || "").toLowerCase().trim();
  if (HIGH_RISK_OCCUPATIONS.some(o => occupation.includes(o))) {
    factors.occupationRisk = 100;
    factors.details.occupation = "High-risk occupation";
  } else if (ELEVATED_RISK_OCCUPATIONS.some(o => occupation.includes(o))) {
    factors.occupationRisk = 50;
    factors.details.occupation = "Elevated-risk occupation";
  } else if (!occupation) {
    factors.occupationRisk = 20;
    factors.details.occupation = "No occupation on file";
  } else {
    factors.occupationRisk = 10;
    factors.details.occupation = "Standard occupation";
  }

  const wealth = (sourceOfWealth || "").toLowerCase();
  if (!wealth) {
    factors.sourceOfWealthRisk = 40;
    factors.details.sourceOfWealth = "Not documented";
  } else if (["inheritance", "salary", "pension", "savings"].some(s => wealth.includes(s))) {
    factors.sourceOfWealthRisk = 10;
    factors.details.sourceOfWealth = "Standard source";
  } else if (["business", "investments", "trading"].some(s => wealth.includes(s))) {
    factors.sourceOfWealthRisk = 30;
    factors.details.sourceOfWealth = "Business/investment income";
  } else if (["cryptocurrency", "gambling", "lottery", "gift"].some(s => wealth.includes(s))) {
    factors.sourceOfWealthRisk = 80;
    factors.details.sourceOfWealth = "High-risk source";
  } else {
    factors.sourceOfWealthRisk = 25;
    factors.details.sourceOfWealth = "Other source";
  }

  if (pepStatus) {
    factors.pepRisk = 100;
    factors.details.pep = "Politically Exposed Person";
  } else {
    factors.pepRisk = 0;
    factors.details.pep = "Not a PEP";
  }

  if (screeningRiskScore >= 70) {
    factors.details.screening = "Sanctions/watchlist match detected";
  } else if (screeningRiskScore >= 30) {
    factors.details.screening = "Low-confidence match (auto-resolved)";
  } else {
    factors.details.screening = "Clear";
  }

  const riskScore = Math.round(
    factors.residencyRisk * RISK_WEIGHTS.residency +
    factors.occupationRisk * RISK_WEIGHTS.occupation +
    factors.sourceOfWealthRisk * RISK_WEIGHTS.sourceOfWealth +
    factors.pepRisk * RISK_WEIGHTS.pep +
    factors.screeningRisk * RISK_WEIGHTS.screening
  );

  let riskTier: RiskRatingResult["riskTier"];
  if (riskScore >= 80) {
    riskTier = "prohibited";
  } else if (riskScore >= 50) {
    riskTier = "high";
  } else if (riskScore >= 25) {
    riskTier = "standard";
  } else {
    riskTier = "low";
  }

  return { riskScore, riskTier, factors };
}

export function getReviewFrequencyMonths(riskTier: string): number {
  switch (riskTier) {
    case "high":
    case "prohibited":
      return 12;
    case "standard":
      return 24;
    case "low":
    default:
      return 36;
  }
}

export function calculateNextReviewDate(riskTier: string, fromDate?: string): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  const months = getReviewFrequencyMonths(riskTier);
  base.setMonth(base.getMonth() + months);
  return base.toISOString().split("T")[0];
}

export function getRequiredEddDocuments(triggerReason: string): string[] {
  const base = [
    "Enhanced Identity Verification",
    "Source of Wealth Documentation",
    "Source of Funds Documentation",
  ];

  if (triggerReason.toLowerCase().includes("pep")) {
    base.push("PEP Declaration Form", "Related Party Disclosure", "Asset Declaration");
  }

  if (triggerReason.toLowerCase().includes("high-risk") || triggerReason.toLowerCase().includes("jurisdiction")) {
    base.push("Country-Specific Compliance Forms", "Correspondent Banking Documentation");
  }

  if (triggerReason.toLowerCase().includes("screening") || triggerReason.toLowerCase().includes("match") || triggerReason.toLowerCase().includes("ofac") || triggerReason.toLowerCase().includes("sdn")) {
    base.push("Detailed Background Check Report", "Adverse Media Search Results");
  }

  base.push("Risk Assessment Summary", "Senior Management Approval Form");

  return base;
}

export function parseOfacSdnCsvLine(line: string): { sdnName: string; sdnType: string; program: string; title: string; remarks: string; sourceId: string } | null {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());

  if (fields.length < 3) return null;

  const sourceId = fields[0] || "";
  const sdnName = fields[1] || "";
  const sdnType = fields[2] || "";
  const program = fields[3] || "";
  const title = fields[4] || "";
  const remarks = fields.length > 11 ? fields[11] || "" : "";

  if (!sdnName || sdnName === "SDN_Name") return null;

  return { sdnName, sdnType, program, title, remarks, sourceId };
}
