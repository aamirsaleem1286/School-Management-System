import "server-only";
import ExcelJS from "exceljs";

export type ExportColumn = { header: string; key: string; width?: number };

export async function buildWorkbook(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Solution IT School ERP";
  wb.created = new Date();
  const ws = wb.addWorksheet(title.slice(0, 31) || "Report");

  ws.mergeCells(1, 1, 1, Math.max(columns.length, 1));
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF0B1B3A" } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, Math.max(columns.length, 1));
  const metaCell = ws.getCell(2, 1);
  metaCell.value = `Generated ${new Date().toLocaleString("en-GB")}`;
  metaCell.font = { size: 9, color: { argb: "FF64748B" } };

  const headerRow = ws.getRow(4);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1B3A" } };
    cell.alignment = { vertical: "middle" };
    ws.getColumn(i + 1).width = col.width || Math.max(14, col.header.length + 4);
  });
  headerRow.height = 20;

  rows.forEach((row, idx) => {
    const r = ws.getRow(idx + 5);
    columns.forEach((col, i) => {
      const cell = r.getCell(i + 1);
      cell.value = (row[col.key] ?? "") as ExcelJS.CellValue;
      cell.alignment = { vertical: "middle", wrapText: false };
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
      }
    });
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: Math.max(columns.length, 1) } };
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function toCsv(columns: ExportColumn[], rows: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}
