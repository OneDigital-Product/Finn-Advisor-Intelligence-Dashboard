export async function renderReportHtml(content: any, reportName?: string): Promise<string> {
  const { sections, generatedAt } = content;

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .report-header { border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 30px; }
    .report-title { font-size: 28px; font-weight: bold; color: #0066cc; }
    .report-meta { font-size: 13px; color: #666; margin-top: 5px; }
    .section { margin: 25px 0; page-break-inside: avoid; }
    .section-title { font-size: 18px; font-weight: bold; color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
    .section-data { background: #f9f9f9; padding: 15px; border-left: 4px solid #0066cc; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #e8f4ff; font-weight: bold; }
    tr:hover { background: #f5f5f5; }
    .currency { text-align: right; font-family: monospace; }
    .annotation { font-size: 12px; color: #555; margin-top: 10px; background: #fffef0; padding: 10px; border-left: 3px solid #ffc107; font-style: italic; }
    dl { font-size: 13px; }
    dt { font-weight: bold; margin-top: 8px; }
    dd { margin-left: 0; margin-bottom: 8px; color: #666; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title">${escapeHtml(reportName || "Report")}</div>
    <div class="report-meta">Generated: ${new Date(generatedAt).toLocaleDateString()} at ${new Date(generatedAt).toLocaleTimeString()}</div>
  </div>`;

  for (const section of sections) {
    if (section.visibilityOverrides?.hidden) continue;

    html += `<div class="section"><div class="section-title">${escapeHtml(section.title)}</div><div class="section-data">`;
    html += renderSectionData(section.data, section.formatRules) || "<p>No data</p>";
    html += `</div>`;

    if (section.annotations && section.annotations.length > 0) {
      for (const ann of section.annotations) {
        html += `<div class="annotation">\u{1F4DD} ${escapeHtml(ann.text)}</div>`;
      }
    }

    html += `</div>`;
  }

  html += `</body></html>`;
  return html;
}

function renderSectionData(data: any, formatRules: any): string {
  if (!data) return "";

  if (Array.isArray(data)) {
    if (data.length === 0) return "<p><em>No data available</em></p>";

    const keys = Object.keys(data[0]);
    let table = `<table><thead><tr>`;
    for (const k of keys) {
      table += `<th>${formatKey(k)}</th>`;
    }
    table += `</tr></thead><tbody>`;

    for (const row of data) {
      table += `<tr>`;
      for (const k of keys) {
        const val = row[k];
        const formatted = formatValue(val, k, formatRules);
        const isCurr = /balance|aum|value|amount|allocation/i.test(k);
        table += `<td class="${isCurr ? "currency" : ""}">${formatted}</td>`;
      }
      table += `</tr>`;
    }

    table += `</tbody></table>`;
    return table;
  } else if (typeof data === "object") {
    let html = `<dl>`;
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "object" && val !== null && !Array.isArray(val)) continue;
      if (Array.isArray(val)) {
        html += `<dt>${formatKey(key)}</dt><dd>${val.length} items</dd>`;
        continue;
      }
      const formatted = formatValue(val, key, formatRules);
      html += `<dt>${formatKey(key)}</dt><dd>${formatted}</dd>`;
    }
    html += `</dl>`;
    return html;
  }

  return String(data);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(val: any, key: string, _rules: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") {
    if (/balance|aum|value|amount|allocation/i.test(key)) {
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (/percent|pct|%|percentage/i.test(key)) {
      return `${val.toFixed(2)}%`;
    }
    return val.toLocaleString();
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return escapeHtml(String(val));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
