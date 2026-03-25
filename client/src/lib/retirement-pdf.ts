function svgToCanvas(svgElement: SVGSVGElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    const canvas = document.createElement("canvas");
    const rect = svgElement.getBoundingClientRect();
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img load failed")); };
    img.src = url;
  });
}

interface ScenarioData {
  name: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  annualSpending: string;
  expectedReturn: string;
  returnStdDev: string;
  inflationRate: string;
  preRetirementContribution: string;
  events?: Array<{
    name: string;
    type: string;
    amount: string;
    startAge: number;
    endAge?: number | null;
    inflationAdjusted: boolean;
  }>;
  results?: {
    successRate: number;
    numSimulations: number;
    finalBalanceStats: {
      mean: number;
      median: number;
      min: number;
      max: number;
      p10: number;
      p25: number;
      p75: number;
      p90: number;
    };
    yearOfDepletion: {
      median: number | null;
      p10: number | null;
      p25: number | null;
    };
    percentilePaths: {
      ages: number[];
      p10: number[];
      p25: number[];
      p50: number[];
      p75: number[];
      p90: number[];
    };
  };
}

import { formatCurrency } from "@/lib/format";

function fmtCurrency(val: number): string {
  const num = isNaN(val) ? 0 : val;
  return formatCurrency(num, { abbreviated: false });
}

function fmtPct(val: string | number): string {
  const num = parseFloat(val as string);
  return (isNaN(num) ? 0 : num * 100).toFixed(1) + "%";
}

export async function generateRetirementPDF(
  scenario: ScenarioData,
  clientName: string,
  portfolioValue: number,
  chartContainer: HTMLDivElement | null
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const brandBlue: [number, number, number] = [37, 87, 143];
  const darkGray: [number, number, number] = [50, 50, 50];
  const medGray: [number, number, number] = [120, 120, 120];
  const lightBg: [number, number, number] = [245, 247, 250];

  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Retirement Projection Report", margin, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Prepared for ${clientName}  ·  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 24);

  y = 40;

  doc.setTextColor(...darkGray);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Scenario: ${scenario.name}`, margin, y);
  y += 8;

  const params = [
    ["Current Age", String(scenario.currentAge)],
    ["Retirement Age", String(scenario.retirementAge)],
    ["Life Expectancy", String(scenario.lifeExpectancy)],
    ["Current Portfolio", fmtCurrency(portfolioValue)],
    ["Annual Spending (Retirement)", fmtCurrency(parseFloat(scenario.annualSpending))],
    ["Pre-Retirement Contribution", fmtCurrency(parseFloat(scenario.preRetirementContribution || "0"))],
    ["Expected Return", fmtPct(scenario.expectedReturn)],
    ["Volatility (Std Dev)", fmtPct(scenario.returnStdDev)],
    ["Inflation Rate", fmtPct(scenario.inflationRate)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Assumption", "Value"]],
    body: params,
    theme: "grid",
    headStyles: { fillColor: brandBlue, fontSize: 9, fontStyle: "bold", cellPadding: 3 },
    bodyStyles: { fontSize: 9, cellPadding: 3, textColor: darkGray },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: contentW * 0.55 }, 1: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  if (scenario.events && scenario.events.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("Life Events & Income Sources", margin, y);
    y += 5;

    const eventRows = scenario.events.map(e => [
      e.name,
      e.type === "income" ? "Income" : "Expense",
      fmtCurrency(parseFloat(e.amount)) + "/yr",
      `Age ${e.startAge}${e.endAge ? "–" + e.endAge : "+"}`,
      e.inflationAdjusted ? "Yes" : "No",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Event", "Type", "Amount", "Duration", "Inflation Adj."]],
      body: eventRows,
      theme: "grid",
      headStyles: { fillColor: brandBlue, fontSize: 9, fontStyle: "bold", cellPadding: 3 },
      bodyStyles: { fontSize: 9, cellPadding: 3, textColor: darkGray },
      alternateRowStyles: { fillColor: lightBg },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "center" },
        4: { halign: "center" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  const results = scenario.results;
  if (!results) {
    doc.setFontSize(10);
    doc.setTextColor(...medGray);
    doc.text("Simulation has not been run yet. Run the simulation to generate results.", margin, y);
    doc.save(`Retirement_Report_${clientName.replace(/\s+/g, "_")}_${scenario.name.replace(/\s+/g, "_")}.pdf`);
    return;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("Simulation Results", margin, y);
  y += 3;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);
  doc.text(`Based on ${results.numSimulations.toLocaleString()} Monte Carlo simulations`, margin, y + 4);
  y += 10;

  const successRate = results.successRate;
  const gaugeW = contentW;
  const gaugeH = 8;
  const gaugeColor: [number, number, number] = successRate >= 80 ? [16, 185, 129] : successRate >= 60 ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(230, 230, 230);
  doc.roundedRect(margin, y, gaugeW, gaugeH, 3, 3, "F");
  doc.setFillColor(...gaugeColor);
  doc.roundedRect(margin, y, gaugeW * (successRate / 100), gaugeH, 3, 3, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gaugeColor);
  doc.text(`${successRate}%`, margin + gaugeW / 2, y + gaugeH + 10, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...medGray);
  doc.text("Probability of Success", margin + gaugeW / 2, y + gaugeH + 15, { align: "center" });

  y += gaugeH + 22;

  const statsData = [
    ["Median Final Balance", fmtCurrency(results.finalBalanceStats.median)],
    ["Mean Final Balance", fmtCurrency(results.finalBalanceStats.mean)],
    ["Best Case (90th Percentile)", fmtCurrency(results.finalBalanceStats.p90)],
    ["Good Case (75th Percentile)", fmtCurrency(results.finalBalanceStats.p75)],
    ["Cautious Case (25th Percentile)", fmtCurrency(results.finalBalanceStats.p25)],
    ["Worst Case (10th Percentile)", fmtCurrency(results.finalBalanceStats.p10)],
    ["Minimum Outcome", fmtCurrency(results.finalBalanceStats.min)],
    ["Maximum Outcome", fmtCurrency(results.finalBalanceStats.max)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: statsData,
    theme: "grid",
    headStyles: { fillColor: brandBlue, fontSize: 9, fontStyle: "bold", cellPadding: 3 },
    bodyStyles: { fontSize: 9, cellPadding: 3, textColor: darkGray },
    alternateRowStyles: { fillColor: lightBg },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: contentW * 0.55 }, 1: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if (results.yearOfDepletion.median) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, "S");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("WARNING: Depletion Risk", margin + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 29, 29);
    doc.text(
      `In scenarios where the portfolio runs out, the median depletion age is ${results.yearOfDepletion.median}. Consider reducing spending, increasing contributions, or adjusting the retirement age.`,
      margin + 4, y + 10, { maxWidth: contentW - 8 }
    );
    y += 18;
  }

  const svgEl = chartContainer?.querySelector("svg.recharts-surface") as SVGSVGElement | null;
  if (svgEl) {
    doc.addPage();
    y = margin;

    doc.setFillColor(...brandBlue);
    doc.rect(0, 0, pageW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Projected Wealth Over Time", margin, 12);
    y = 26;

    try {
      const canvas = await svgToCanvas(svgEl);
      const imgData = canvas.toDataURL("image/png", 1.0);
      const chartAspect = canvas.width / canvas.height;
      const chartW = contentW;
      const chartH = chartW / chartAspect;
      doc.addImage(imgData, "PNG", margin, y, chartW, Math.min(chartH, 130));
      y += Math.min(chartH, 130) + 6;
    } catch {
      doc.setFontSize(9);
      doc.setTextColor(...medGray);
      doc.text("Chart image could not be captured.", margin, y + 5);
      y += 10;
    }

    doc.setFontSize(9);
    doc.setTextColor(...medGray);
    doc.text("Chart shows projected portfolio value from current age through life expectancy across five percentile bands.", margin, y, { maxWidth: contentW });
    y += 10;
  }

  const paths = results.percentilePaths;
  if (paths && paths.ages && paths.ages.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text("Projected Wealth by Age (Selected Years)", margin, y);
    y += 5;

    const step = Math.max(1, Math.floor(paths.ages.length / 15));
    const tableRows: string[][] = [];
    for (let i = 0; i < paths.ages.length; i += step) {
      tableRows.push([
        String(paths.ages[i]),
        fmtCurrency(paths.p90[i]),
        fmtCurrency(paths.p75[i]),
        fmtCurrency(paths.p50[i]),
        fmtCurrency(paths.p25[i]),
        fmtCurrency(paths.p10[i]),
      ]);
    }
    const lastIdx = paths.ages.length - 1;
    if (tableRows.length === 0 || tableRows[tableRows.length - 1][0] !== String(paths.ages[lastIdx])) {
      tableRows.push([
        String(paths.ages[lastIdx]),
        fmtCurrency(paths.p90[lastIdx]),
        fmtCurrency(paths.p75[lastIdx]),
        fmtCurrency(paths.p50[lastIdx]),
        fmtCurrency(paths.p25[lastIdx]),
        fmtCurrency(paths.p10[lastIdx]),
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Age", "90th %ile", "75th %ile", "Median", "25th %ile", "10th %ile"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: brandBlue, fontSize: 8, fontStyle: "bold", cellPadding: 2.5 },
      bodyStyles: { fontSize: 8, cellPadding: 2.5, halign: "right", textColor: darkGray },
      alternateRowStyles: { fillColor: lightBg },
      columnStyles: { 0: { halign: "center", fontStyle: "bold" } },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text(
      "This report is for illustrative purposes only and does not guarantee future performance. Past performance is not indicative of future results. Monte Carlo simulations model probability, not certainty.",
      margin, pageH - 10, { maxWidth: contentW }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 10, { align: "right" });
    doc.text("OneDigital Wealth Management", margin, pageH - 6);
  }

  doc.save(`Retirement_Report_${clientName.replace(/\s+/g, "_")}_${scenario.name.replace(/\s+/g, "_")}.pdf`);
}
