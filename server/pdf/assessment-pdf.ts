import { BrandedPDF } from "./base-pdf";
import type { AssessmentResult, DomainAssessment } from "../engines/assessment-engine";

const DOMAIN_LABELS: Record<string, string> = {
  cashflow: "Cash Flow & Budgeting",
  investment: "Investment & Portfolio",
  insurance: "Insurance Coverage",
  tax: "Tax Optimization",
  retirement: "Retirement Planning",
  estate: "Estate & Legacy",
  education: "Education Funding",
};

export class AssessmentPDF extends BrandedPDF {
  async generate(assessment: AssessmentResult, client: any, advisorName?: string): Promise<Buffer> {
    this.addCoverPage(client, assessment, advisorName);
    this.newPage();

    this.addExecutiveSummary(assessment);
    this.newPage();

    if (assessment.criticalActions.length > 0) {
      this.addCriticalActions(assessment);
      this.newPage();
    }

    for (let i = 0; i < assessment.domains.length; i++) {
      this.addDomainSection(assessment.domains[i]);
      if (i < assessment.domains.length - 1) {
        this.newPage();
      }
    }

    this.newPage();
    this.addBackPage(client, advisorName);

    return this.toBuffer();
  }

  private addCoverPage(client: any, assessment: AssessmentResult, advisorName?: string): void {
    this.doc
      .rect(0, 0, this.pageWidth, this.pageHeight)
      .fill("#1E4B82");

    this.doc
      .rect(0, this.pageHeight * 0.7, this.pageWidth, this.pageHeight * 0.3)
      .fill("#163a66");

    this.doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#FFFFFF")
      .text("OneDigital", this.margin + 20, 80);

    this.doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#6DB7E0")
      .text("WEALTH MANAGEMENT", this.margin + 20, 115);

    this.doc
      .moveTo(this.margin + 20, 145)
      .lineTo(this.margin + 120, 145)
      .strokeColor("#F0AD00")
      .lineWidth(3)
      .stroke();

    this.doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#FFFFFF")
      .text("Financial Assessment Report", this.margin + 20, 180, {
        width: this.contentWidth - 40,
      });

    this.doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor("#6DB7E0")
      .text("Comprehensive Financial Planning Analysis", this.margin + 20, 220);

    this.doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor("#FFFFFF")
      .text(`Prepared for`, this.margin + 20, 300);

    this.doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#FFFFFF")
      .text(`${client.firstName} ${client.lastName}`, this.margin + 20, 325);

    this.doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#6DB7E0")
      .text(
        new Date(assessment.generatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        this.margin + 20,
        360
      );

    const scoreX = this.pageWidth - this.margin - 140;
    const scoreY = 290;
    const scoreColor = assessment.overallScore >= 70 ? "#059669" : assessment.overallScore >= 40 ? "#F0AD00" : "#dc2626";

    this.doc
      .roundedRect(scoreX, scoreY, 120, 90, 8)
      .fill("rgba(255,255,255,0.1)");

    this.doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6DB7E0")
      .text("OVERALL SCORE", scoreX, scoreY + 10, { width: 120, align: "center" });

    this.doc
      .font("Helvetica-Bold")
      .fontSize(36)
      .fillColor(scoreColor)
      .text(`${assessment.overallScore}`, scoreX, scoreY + 28, { width: 120, align: "center" });

    this.doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#FFFFFF")
      .text("out of 100", scoreX, scoreY + 68, { width: 120, align: "center" });

    if (advisorName) {
      this.doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#FFFFFF")
        .text(`Prepared by: ${advisorName}`, this.margin + 20, this.pageHeight * 0.75);
    }

    this.doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6DB7E0")
      .text("This report is confidential and intended solely for the client named above.", this.margin + 20, this.pageHeight - 60, {
        width: this.contentWidth - 40,
      });
  }

  private addExecutiveSummary(assessment: AssessmentResult): void {
    this.addSectionTitle("Executive Summary");
    this.addParagraph(assessment.summary, { fontSize: 11 });
    this.y += 10;

    this.doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#1E4B82")
      .text("Domain Overview", this.margin, this.y);
    this.y += 15;

    for (const domain of assessment.domains) {
      this.addScoreIndicator(domain.score, DOMAIN_LABELS[domain.domain] || domain.domain);
    }
  }

  private addCriticalActions(assessment: AssessmentResult): void {
    this.addSectionTitle("Priority Action Items", "#dc2626");

    this.addParagraph(
      "The following items have been identified as high-priority actions that should be addressed promptly to improve your financial position.",
      { fontSize: 10, color: "#6b7280" }
    );
    this.y += 5;

    for (let i = 0; i < assessment.criticalActions.length; i++) {
      const action = assessment.criticalActions[i];
      this.checkPageBreak(40);

      this.doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#1E4B82")
        .text(`${i + 1}. ${action.action}`, this.margin + 10, this.y, {
          width: this.contentWidth - 20,
        });

      const actionHeight = this.doc.heightOfString(`${i + 1}. ${action.action}`, { width: this.contentWidth - 20 });
      this.y += actionHeight + 4;

      if (action.rationale) {
        this.doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#6b7280")
          .text(action.rationale, this.margin + 20, this.y, {
            width: this.contentWidth - 30,
          });
        const rationaleHeight = this.doc.heightOfString(action.rationale, { width: this.contentWidth - 30 });
        this.y += rationaleHeight + 8;
      }
    }
  }

  private addDomainSection(domain: DomainAssessment): void {
    const label = DOMAIN_LABELS[domain.domain] || domain.domain;
    this.addSectionTitle(label);

    this.addStatusBadge(domain.status);
    this.addScoreIndicator(domain.score, "Domain Score");
    this.y += 5;

    this.addParagraph(domain.summary, { fontSize: 10 });
    this.y += 5;

    if (Object.keys(domain.keyMetrics).length > 0) {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#1E4B82")
        .text("Key Metrics", this.margin, this.y);
      this.y += 14;

      for (const [key, value] of Object.entries(domain.keyMetrics)) {
        const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        this.addKeyValueRow(formattedKey, String(value));
      }
      this.y += 5;
    }

    if (domain.recommendations.length > 0) {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#1E4B82")
        .text("Recommendations", this.margin, this.y);
      this.y += 14;

      for (const rec of domain.recommendations) {
        this.addBulletPoint(rec.action, rec.priority);
        if (rec.rationale) {
          this.addParagraph(rec.rationale, { fontSize: 8, color: "#6b7280", indent: 22 });
        }
        if (rec.estimatedCost) {
          this.addParagraph(`Estimated cost: ${rec.estimatedCost}`, { fontSize: 8, color: "#6b7280", indent: 22 });
        }
        if (rec.estimatedImpact) {
          this.addParagraph(`Estimated impact: ${rec.estimatedImpact}`, { fontSize: 8, color: "#6b7280", indent: 22 });
        }
      }
    }
  }

  private addBackPage(client: any, advisorName?: string): void {
    this.addSectionTitle("Important Disclosures");

    this.addParagraph(
      "This financial assessment report has been prepared by OneDigital Wealth Management for the exclusive use of the named client. " +
        "The analysis and recommendations contained herein are based on data available at the time of generation and should be reviewed in conjunction with your financial advisor.",
      { fontSize: 9, color: "#6b7280" }
    );

    this.y += 5;
    this.addParagraph(
      "Investment advisory services are offered through OneDigital Investment Advisors, an SEC-registered investment adviser. " +
        "Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal.",
      { fontSize: 9, color: "#6b7280" }
    );

    this.y += 5;
    this.addParagraph(
      "The information provided does not constitute tax, legal, or accounting advice. Clients should consult with their own tax, legal, and accounting advisors before engaging in any transaction.",
      { fontSize: 9, color: "#6b7280" }
    );

    this.y += 20;
    if (advisorName) {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#1E4B82")
        .text("Your Advisor", this.margin, this.y);
      this.y += 14;

      this.doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1a1a2e")
        .text(advisorName, this.margin + 10, this.y);
      this.y += 14;
    }

    this.doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text("OneDigital Wealth Management", this.margin + 10, this.y);
    this.y += 12;

    this.doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(
        `Report generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`,
        this.margin + 10,
        this.y
      );
  }
}
