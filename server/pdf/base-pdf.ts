import PDFDocument from "pdfkit";

const COLORS = {
  primary: "#1E4B82",
  secondary: "#6DB7E0",
  accent: "#F0AD00",
  text: "#1a1a2e",
  textLight: "#6b7280",
  white: "#FFFFFF",
  lightBg: "#f8fafc",
  border: "#e5e7eb",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
};

export class BrandedPDF {
  protected doc: PDFKit.PDFDocument;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 50;
  protected contentWidth: number;
  protected y: number = 50;
  protected pageCount: number = 0;

  constructor(orientation: "portrait" | "landscape" = "portrait") {
    this.doc = new PDFDocument({
      size: "letter",
      layout: orientation,
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: "OneDigital Financial Assessment",
        Author: "OneDigital Wealth Management",
        Creator: "OneDigital Advisor Platform",
      },
    });
    this.pageWidth = orientation === "portrait" ? 612 : 792;
    this.pageHeight = orientation === "portrait" ? 792 : 612;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  protected addHeader(): void {
    this.doc.save();
    this.doc
      .rect(0, 0, this.pageWidth, 40)
      .fill(COLORS.primary);

    this.doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.white)
      .text("OneDigital", this.margin, 12, { continued: true })
      .font("Helvetica")
      .fontSize(8)
      .text("  WEALTH MANAGEMENT", { baseline: "alphabetic" });

    this.doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.white)
      .text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        this.pageWidth - this.margin - 120, 15, { width: 120, align: "right" });

    this.doc.restore();
    this.y = 55;
  }

  protected addFooter(): void {
    const footerY = this.pageHeight - 45;
    this.doc.save();

    this.doc
      .moveTo(this.margin, footerY)
      .lineTo(this.pageWidth - this.margin, footerY)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    this.doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text(
        "This assessment is for informational purposes only and should not be considered financial advice. Past performance does not guarantee future results. Please consult with your financial advisor.",
        this.margin, footerY + 5,
        { width: this.contentWidth - 60, align: "left" }
      );

    this.doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text(
        `Confidential`,
        this.pageWidth - this.margin - 60, footerY + 5,
        { width: 60, align: "right" }
      );

    this.doc.restore();
  }

  protected addSectionTitle(title: string, color: string = COLORS.primary): void {
    this.checkPageBreak(30);
    this.doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(color)
      .text(title, this.margin, this.y);
    this.y += 20;

    this.doc
      .moveTo(this.margin, this.y)
      .lineTo(this.pageWidth - this.margin, this.y)
      .strokeColor(COLORS.secondary)
      .lineWidth(1)
      .stroke();
    this.y += 10;
  }

  protected addParagraph(text: string, options: { fontSize?: number; color?: string; indent?: number } = {}): void {
    const fontSize = options.fontSize || 10;
    const color = options.color || COLORS.text;
    const indent = options.indent || 0;

    this.doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor(color);

    const height = this.doc.heightOfString(text, {
      width: this.contentWidth - indent,
    });
    this.checkPageBreak(height + 5);

    this.doc.text(text, this.margin + indent, this.y, {
      width: this.contentWidth - indent,
      lineGap: 3,
    });
    this.y += height + 8;
  }

  protected addBulletPoint(text: string, priority?: string): void {
    this.checkPageBreak(20);

    let bulletColor = COLORS.text;
    if (priority === "high") bulletColor = COLORS.danger;
    else if (priority === "medium") bulletColor = COLORS.warning;
    else if (priority === "low") bulletColor = COLORS.success;

    this.doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(bulletColor)
      .text("●", this.margin + 10, this.y);

    if (priority) {
      this.doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(bulletColor)
        .text(`[${priority.toUpperCase()}]`, this.margin + 22, this.y, { continued: true })
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(` ${text}`, { width: this.contentWidth - 35 });
    } else {
      this.doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(text, this.margin + 22, this.y, { width: this.contentWidth - 35 });
    }

    const textHeight = this.doc.heightOfString(text, { width: this.contentWidth - 35 });
    this.y += Math.max(textHeight, 12) + 4;
  }

  protected addKeyValueRow(key: string, value: string): void {
    this.checkPageBreak(15);

    this.doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.textLight)
      .text(key, this.margin + 10, this.y, { width: 150 });

    this.doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(String(value), this.margin + 165, this.y, { width: this.contentWidth - 175 });

    this.y += 16;
  }

  protected addScoreIndicator(score: number, label: string): void {
    this.checkPageBreak(35);

    const barWidth = 200;
    const barHeight = 12;
    const barX = this.margin + 10;

    this.doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(label, barX, this.y);
    this.y += 14;

    this.doc
      .rect(barX, this.y, barWidth, barHeight)
      .fill(COLORS.border);

    const scoreColor = score >= 70 ? COLORS.success : score >= 40 ? COLORS.warning : COLORS.danger;
    this.doc
      .rect(barX, this.y, barWidth * (score / 100), barHeight)
      .fill(scoreColor);

    this.doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(`${score}/100`, barX + barWidth + 10, this.y + 1);

    this.y += barHeight + 10;
  }

  protected addStatusBadge(status: string): void {
    const colors: Record<string, string> = {
      on_track: COLORS.success,
      action_needed: COLORS.danger,
      review: COLORS.warning,
    };
    const labels: Record<string, string> = {
      on_track: "On Track",
      action_needed: "Action Needed",
      review: "Needs Review",
    };

    const color = colors[status] || COLORS.textLight;
    const label = labels[status] || status;

    this.doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(color)
      .text(`Status: ${label}`, this.margin + 10, this.y);
    this.y += 14;
  }

  protected newPage(): void {
    this.addFooter();
    this.doc.addPage();
    this.pageCount++;
    this.addHeader();
  }

  protected checkPageBreak(neededHeight: number): void {
    if (this.y + neededHeight > this.pageHeight - 70) {
      this.newPage();
    }
  }

  toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);

      const pages = this.doc.bufferedPageRange();
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        this.doc.switchToPage(i);
        this.addFooter();
      }

      this.doc.end();
    });
  }
}
