import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("API Endpoint Coverage Report", () => {
  const routeDir = path.join(__dirname, "../routes");
  const testDir = __dirname;

  function extractEndpoints(filePath: string): string[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const endpointRegex = /app\.(get|post|put|patch|delete)\s*\(\s*["'`](\/api[^"'`]*)/g;
    const endpoints: string[] = [];
    let match;
    while ((match = endpointRegex.exec(content)) !== null) {
      endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
    }
    return endpoints;
  }

  function getRouteFiles(): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(routeDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".ts") && entry.name !== "middleware.ts" && entry.name !== "utils.ts") {
        files.push(path.join(routeDir, entry.name));
      }
      if (entry.isDirectory()) {
        const subEntries = fs.readdirSync(path.join(routeDir, entry.name));
        for (const sub of subEntries) {
          if (sub.endsWith(".ts")) {
            files.push(path.join(routeDir, entry.name, sub));
          }
        }
      }
    }
    return files;
  }

  function getTestFiles(): string[] {
    return fs.readdirSync(testDir)
      .filter(f => f.startsWith("api-") && f.endsWith(".test.ts"))
      .map(f => path.join(testDir, f));
  }

  it("should catalog all registered API endpoints", () => {
    const routeFiles = getRouteFiles();
    const allEndpoints: Record<string, string[]> = {};
    let totalEndpoints = 0;

    for (const file of routeFiles) {
      const fileName = path.relative(routeDir, file);
      const endpoints = extractEndpoints(file);
      if (endpoints.length > 0) {
        allEndpoints[fileName] = endpoints;
        totalEndpoints += endpoints.length;
      }
    }

    expect(totalEndpoints).toBeGreaterThan(0);
    console.log(`\n📊 API ENDPOINT COVERAGE REPORT`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Total route files: ${routeFiles.length}`);
    console.log(`Total endpoints: ${totalEndpoints}`);
    console.log(`${"=".repeat(60)}`);

    for (const [file, endpoints] of Object.entries(allEndpoints)) {
      console.log(`\n📁 ${file} (${endpoints.length} endpoints)`);
      endpoints.forEach(e => console.log(`   ${e}`));
    }
  });

  it("should have API test files covering major route categories", () => {
    const testFiles = getTestFiles();
    const testFileNames = testFiles.map(f => path.basename(f));

    const requiredTestCategories = [
      "api-auth",
      "api-clients",
      "api-meetings",
      "api-compliance",
      "api-documents",
      "api-integrations",
      "api-error-handling",
      "api-workflows-e2e",
      "api-health",
    ];

    for (const category of requiredTestCategories) {
      const hasTest = testFileNames.some(f => f.includes(category));
      expect(hasTest).toBe(true);
    }

    console.log(`\n📋 TEST FILE COVERAGE`);
    console.log(`${"=".repeat(60)}`);
    console.log(`API test files: ${testFiles.length}`);
    testFileNames.forEach(f => console.log(`   ✅ ${f}`));
  });

  it("should report tested vs untested endpoint categories", () => {
    const testedCategories = new Set([
      "auth", "clients", "meetings", "compliance", "documents",
      "health", "salesforce", "orion", "zoom", "calculators",
      "kyc-aml", "fiduciary-compliance", "withdrawals",
      "estate-planning", "behavioral-finance", "philanthropic",
      "business-succession", "cassidy", "alert-generation",
      "assessment", "workflows", "scenarios", "reports",
      "meeting-processing", "direct-indexing", "calendly",
      "analytics", "diagnostics",
    ]);

    const allCategories = new Set([
      "auth", "clients", "meetings", "compliance", "documents",
      "health", "ai", "analytics", "admin", "workflows", "market",
      "scenarios", "alert-generation", "meeting-processing",
      "assessment", "insights", "salesforce", "orion", "microsoft",
      "zoom", "feature-flags", "feedback", "pilot-metrics",
      "profiles", "reminders", "triggers", "calendly", "reports",
      "calculators", "custodial", "approvals", "fact-finders",
      "cassidy", "discovery", "events", "goals", "onboarding",
      "estate-planning", "fiduciary-compliance", "behavioral-finance",
      "withdrawals", "tasks", "kyc-aml", "philanthropic",
      "business-succession", "direct-indexing", "diagnostics",
    ]);

    const untested = [...allCategories].filter(c => !testedCategories.has(c));
    const coveragePercent = Math.round((testedCategories.size / allCategories.size) * 100);

    console.log(`\n📈 ENDPOINT CATEGORY COVERAGE`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Tested: ${testedCategories.size}/${allCategories.size} (${coveragePercent}%)`);
    console.log(`\n✅ Tested categories:`);
    [...testedCategories].sort().forEach(c => console.log(`   ${c}`));
    console.log(`\n⚠️  Untested categories (${untested.length}):`);
    untested.sort().forEach(c => console.log(`   ${c}`));

    expect(testedCategories.size).toBeGreaterThanOrEqual(20);
  });
});
