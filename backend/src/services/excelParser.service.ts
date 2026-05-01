import ExcelJS from 'exceljs';

import type { TableMatrix } from './tableDiff.service.js';

export interface ParsedExcelSheet {
  name: string;
  rows: TableMatrix;
}

function stringifyCellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }

    if ('formula' in value) {
      return value.result === undefined ? String(value.formula) : stringifyCellValue(value.result);
    }

    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }

    if ('hyperlink' in value && 'text' in value && typeof value.text === 'string') {
      return value.text;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function parseWorksheet(worksheet: ExcelJS.Worksheet): ParsedExcelSheet {
  const rows: TableMatrix = [];
  const rowCount = worksheet.rowCount;
  const columnCount = worksheet.columnCount;

  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: string[] = [];

    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      values.push(stringifyCellValue(row.getCell(columnNumber).value));
    }

    rows.push(values);
  }

  return {
    name: worksheet.name,
    rows
  };
}

export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  return workbook.worksheets.map(parseWorksheet);
}
