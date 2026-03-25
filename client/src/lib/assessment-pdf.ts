const BRAND_COLOR: [number, number, number] = [30, 75, 130];
const BRAND_LIGHT: [number, number, number] = [235, 242, 250];
const GRAY: [number, number, number] = [100, 100, 100];
const DARK: [number, number, number] = [30, 30, 30];

interface Section {
  title: string;
  content: string[][];
  isList?: boolean;
}

function parseHtmlReport(html: string): { title: string; sections: Section[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  let reportTitle = "AI Financial Assessment";
  const sections: Section[] = [];

  const h1 = body.querySelector("h1");
  if (h1) reportTitle = h1.textContent || reportTitle;

  const allElements = Array.from(body.children);
  let currentSection: Section | null = null;

  for (const el of allElements) {
    const tag = el.tagName.toLowerCase();

    if (tag === "h1") continue;

    if (tag === "h2" || tag === "h3") {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: el.textContent || "", content: [] };
      continue;
    }

    if (!currentSection) {
      currentSection = { title: "Overview", content: [] };
    }

    if (tag === "table") {
      const rows = Array.from(el.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map(c => c.textContent?.trim() || "");
        if (cells.length > 0 && cells.some(c => c.length > 0)) {
          currentSection.content.push(cells);
        }
      }
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.querySelectorAll("li"));
      for (const item of items) {
        currentSection.content.push([item.textContent?.trim() || ""]);
      }
      currentSection.isList = true;
    } else if (tag === "div" || tag === "section") {
      const innerH = el.querySelector("h2, h3, h4");
      if (innerH) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { title: innerH.textContent || "", content: [] };
      }
      const tables = el.querySelectorAll("table");
      if (tables.length > 0) {
        tables.forEach(table => {
          const rows = Array.from(table.querySelectorAll("tr"));
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll("th, td")).map(c => c.textContent?.trim() || "");
            if (cells.length > 0 && cells.some(c => c.length > 0)) {
              currentSection!.content.push(cells);
            }
          }
        });
      }
      const lists = el.querySelectorAll("ul, ol");
      if (lists.length > 0) {
        lists.forEach(list => {
          const items = Array.from(list.querySelectorAll("li"));
          for (const item of items) {
            currentSection!.content.push([item.textContent?.trim() || ""]);
          }
        });
        if (!tables.length) currentSection.isList = true;
      }
      if (!tables.length && !lists.length) {
        const text = el.textContent?.trim();
        if (text && !innerH) {
          currentSection.content.push([text]);
        }
      }
    } else {
      const text = el.textContent?.trim();
      if (text) {
        currentSection.content.push([text]);
      }
    }
  }

  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return { title: reportTitle, sections };
}

export async function generateAssessmentPDF(
  reportHtml: string,
  clientName: string,
  advisorName: string = "OneDigital Wealth Advisor"
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 25) {
      pdf.addPage();
      y = 20;
      addFooter();
    }
  }

  function addFooter() {
    const pageCount = pdf.getNumberOfPages();
    const currentPage = pageCount;
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.text(
      `OneDigital Wealth Management | Confidential | Page ${currentPage}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  pdf.setFillColor(...BRAND_COLOR);
  pdf.rect(0, 0, pageWidth, 42, "F");

  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.text("AI Financial Assessment", margin, 18);

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "normal");
  pdf.text(clientName, margin, 28);

  pdf.setFontSize(9);
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  pdf.text(`Prepared ${dateStr} by ${advisorName}`, margin, 36);

  y = 52;

  pdf.setFillColor(...BRAND_LIGHT);
  pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
  pdf.setFontSize(8);
  pdf.setTextColor(...GRAY);
  const disclaimerText = "This assessment is generated by AI and is intended for informational purposes only. It does not constitute financial advice. Please consult with your advisor before making investment decisions.";
  const disclaimerLines = pdf.splitTextToSize(disclaimerText, contentWidth - 8);
  pdf.text(disclaimerLines, margin + 4, y + 5);
  y += 18;

  const { sections } = parseHtmlReport(reportHtml);

  for (const section of sections) {
    checkPageBreak(20);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...BRAND_COLOR);
    pdf.text(section.title, margin, y);
    y += 2;

    pdf.setDrawColor(...BRAND_COLOR);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + contentWidth, y);
    y += 6;

    if (section.content.length === 0) continue;

    const maxCols = Math.max(...section.content.map(r => r.length));

    if (maxCols >= 2) {
      const isFirstRowHeader = section.content.length > 2 &&
        section.content[0].every(c => c.length < 50);

      const head = isFirstRowHeader ? [section.content[0]] : undefined;
      const bodyRows = isFirstRowHeader ? section.content.slice(1) : section.content;

      autoTable(pdf, {
        startY: y,
        head: head,
        body: bodyRows,
        margin: { left: margin, right: margin },
        theme: "grid",
        styles: {
          fontSize: 8.5,
          textColor: DARK,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: BRAND_COLOR,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: maxCols === 2 ? {
          0: { cellWidth: contentWidth * 0.45 },
          1: { cellWidth: contentWidth * 0.55 },
        } : undefined,
      });

      y = (pdf as any).lastAutoTable.finalY + 8;
    } else {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...DARK);

      for (const row of section.content) {
        const text = row[0];
        if (!text) continue;

        const isBullet = section.isList;
        const prefix = isBullet ? "  *  " : "";
        const lines = pdf.splitTextToSize(prefix + text, contentWidth - 4);

        checkPageBreak(lines.length * 4.5 + 2);

        for (const line of lines) {
          pdf.text(line, margin + 2, y);
          y += 4.5;
        }
        y += 1;
      }
      y += 4;
    }
  }

  checkPageBreak(20);
  y += 4;
  pdf.setDrawColor(...BRAND_COLOR);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 6;

  pdf.setFontSize(8);
  pdf.setTextColor(...GRAY);
  pdf.setFont("helvetica", "italic");
  const footer = [
    "IMPORTANT DISCLOSURE: This AI Financial Assessment is generated using artificial intelligence and is provided for informational",
    "purposes only. It does not constitute investment advice, a recommendation, or an offer to buy or sell any securities. Past performance",
    "is not indicative of future results. All investments involve risk, including the possible loss of principal. Please consult with your",
    "OneDigital wealth advisor before making any financial decisions based on this assessment.",
    "",
    `OneDigital Investment Advisors LLC | Generated ${dateStr} | Confidential - For Client Use Only`,
  ];
  for (const line of footer) {
    checkPageBreak(5);
    pdf.text(line, margin, y);
    y += 3.5;
  }

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `OneDigital Wealth Management | Confidential | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
  pdf.save(`AI_Financial_Assessment_${safeName}_${new Date().toISOString().split("T")[0]}.pdf`);
}
