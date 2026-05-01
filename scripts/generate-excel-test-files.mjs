import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ExcelJS from 'exceljs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'test-files', 'round-04-csv-excel');

async function writeWorkbook(fileName, sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRows(sheet.rows);
  }

  await workbook.xlsx.writeFile(path.join(outputDir, fileName));
}

await writeWorkbook('excel-left.xlsx', [
  {
    name: 'Users',
    rows: [
      ['id', 'name', 'role'],
      [1, 'Ada', 'student'],
      [2, 'Bob', 'reviewer']
    ]
  },
  {
    name: 'Legacy',
    rows: [
      ['enabled', true],
      ['owner', 'old-system']
    ]
  }
]);

await writeWorkbook('excel-right.xlsx', [
  {
    name: 'Users',
    rows: [
      ['id', 'name', 'role'],
      [1, 'Ada Lovelace', 'student'],
      [2, 'Bob', 'reviewer']
    ]
  },
  {
    name: 'Audit',
    rows: [
      ['enabled', true],
      ['owner', 'new-system']
    ]
  }
]);
