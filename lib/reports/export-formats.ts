/** Multi-format report export (browser downloads). */

export type ExportFormat = "csv" | "xlsx" | "pdf" | "docx" | "tsv" | "json";

export type ExportCell = string | number | null | undefined;

export type ExportSheet = {
  name: string;
  headers: string[];
  rows: ExportCell[][];
};

export type ExportDocument = {
  /** Filename without extension */
  filenameBase: string;
  title: string;
  subtitle?: string;
  sheets: ExportSheet[];
};

export const EXPORT_FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  ext: string;
}[] = [
  { id: "csv", label: "CSV", ext: "csv" },
  { id: "xlsx", label: "Excel (.xlsx)", ext: "xlsx" },
  { id: "pdf", label: "PDF", ext: "pdf" },
  { id: "docx", label: "Word (.docx)", ext: "docx" },
  { id: "tsv", label: "TSV", ext: "tsv" },
  { id: "json", label: "JSON", ext: "json" },
];

function cellText(value: ExportCell): string {
  return value == null ? "" : String(value);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeDelimited(value: ExportCell, delimiter: "," | "\t"): string {
  const s = cellText(value);
  if (delimiter === ",") {
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  if (/[\t\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sheetToDelimited(sheet: ExportSheet, delimiter: "," | "\t"): string {
  const lines = [
    sheet.headers.map((h) => escapeDelimited(h, delimiter)).join(delimiter),
    ...sheet.rows.map((row) =>
      sheet.headers.map((_, i) => escapeDelimited(row[i], delimiter)).join(delimiter)
    ),
  ];
  return lines.join("\n");
}

function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function exportCsvOrTsv(doc: ExportDocument, format: "csv" | "tsv") {
  const delimiter = format === "csv" ? "," : "\t";
  const mime = format === "csv" ? "text/csv;charset=utf-8;" : "text/tab-separated-values;charset=utf-8;";
  const parts = doc.sheets.map((sheet) => {
    const titleLine = escapeDelimited(sheet.name, delimiter);
    return `${titleLine}\n${sheetToDelimited(sheet, delimiter)}`;
  });
  const body = "\uFEFF" + parts.join("\n\n");
  downloadBlob(`${doc.filenameBase}.${format}`, new Blob([body], { type: mime }));
}

async function exportJson(doc: ExportDocument) {
  const payload = {
    title: doc.title,
    subtitle: doc.subtitle ?? null,
    sheets: doc.sheets.map((s) => ({
      name: s.name,
      headers: s.headers,
      rows: s.rows.map((row) =>
        Object.fromEntries(s.headers.map((h, i) => [h, row[i] ?? null]))
      ),
    })),
  };
  downloadBlob(
    `${doc.filenameBase}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" })
  );
}

async function exportXlsx(doc: ExportDocument) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const sheet of doc.sheets) {
    const aoa = [sheet.headers, ...sheet.rows.map((row) => sheet.headers.map((_, i) => row[i] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name, used));
  }
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    `${doc.filenameBase}.xlsx`,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
}

async function exportPdf(doc: ExportDocument) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 40;
  let first = true;

  for (const sheet of doc.sheets) {
    if (!first) pdf.addPage();
    first = false;
    pdf.setFontSize(14);
    pdf.text(doc.title, margin, 36);
    if (doc.subtitle) {
      pdf.setFontSize(10);
      pdf.setTextColor(90);
      pdf.text(doc.subtitle, margin, 52);
      pdf.setTextColor(0);
    }
    pdf.setFontSize(11);
    pdf.text(sheet.name, margin, doc.subtitle ? 70 : 56);

    autoTable(pdf, {
      startY: doc.subtitle ? 78 : 64,
      head: [sheet.headers],
      body: sheet.rows.map((row) => sheet.headers.map((_, i) => cellText(row[i]))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 },
      margin: { left: margin, right: margin },
    });
  }

  pdf.save(`${doc.filenameBase}.pdf`);
}

async function exportDocx(doc: ExportDocument) {
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    HeadingLevel,
    WidthType,
    BorderStyle,
  } = await import("docx");

  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  if (doc.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: doc.subtitle, italics: true, size: 20, color: "666666" })],
        spacing: { after: 200 },
      })
    );
  }

  for (const sheet of doc.sheets) {
    children.push(
      new Paragraph({
        text: sheet.name,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

    const headerRow = new TableRow({
      children: sheet.headers.map(
        (h) =>
          new TableCell({
            borders,
            width: { size: Math.floor(9000 / Math.max(sheet.headers.length, 1)), type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 18 })],
              }),
            ],
          })
      ),
    });

    const dataRows = sheet.rows.map(
      (row) =>
        new TableRow({
          children: sheet.headers.map((_, i) => {
            const text = cellText(row[i]);
            return new TableCell({
              borders,
              width: { size: Math.floor(9000 / Math.max(sheet.headers.length, 1)), type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, size: 18 })],
                }),
              ],
            });
          }),
        })
    );

    children.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [headerRow, ...dataRows],
      })
    );
  }

  const document = new Document({
    sections: [{ children }],
  });
  const buffer = await Packer.toBlob(document);
  downloadBlob(`${doc.filenameBase}.docx`, buffer);
}

/** Download the report document in the chosen format. */
export async function downloadExportDocument(doc: ExportDocument, format: ExportFormat) {
  if (!doc.sheets.length) throw new Error("Nothing to export");
  switch (format) {
    case "csv":
      return exportCsvOrTsv(doc, "csv");
    case "tsv":
      return exportCsvOrTsv(doc, "tsv");
    case "json":
      return exportJson(doc);
    case "xlsx":
      return exportXlsx(doc);
    case "pdf":
      return exportPdf(doc);
    case "docx":
      return exportDocx(doc);
    default:
      throw new Error(`Unsupported format: ${format satisfies never}`);
  }
}
