import assert from 'node:assert/strict';
import test from 'node:test';

import ExcelJS from 'exceljs';

import { compareExcelBuffers } from '../dist/services/excelDiff.service.js';
import { parseExcelBuffer } from '../dist/services/excelParser.service.js';
import { defaultAdvancedRuleOptions } from '../dist/services/advancedRules.service.js';
import { defaultNormalizationOptions } from '../dist/services/normalization.service.js';

async function createWorkbookBuffer(sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRows(sheet.rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

test('parses excel worksheets into matrices', async () => {
  const buffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name'],
        [1, 'Ada']
      ]
    }
  ]);
  const sheets = await parseExcelBuffer(buffer);

  assert.equal(sheets[0].name, 'Users');
  assert.deepEqual(sheets[0].rows, [
    ['id', 'name'],
    ['1', 'Ada']
  ]);
});

test('detects excel sheet and cell differences', async () => {
  const leftBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name'],
        [1, 'Ada']
      ]
    },
    {
      name: 'Legacy',
      rows: [['enabled']]
    }
  ]);
  const rightBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name'],
        [1, 'Ada Lovelace']
      ]
    },
    {
      name: 'Audit',
      rows: [['enabled']]
    }
  ]);
  const diff = await compareExcelBuffers(leftBuffer, rightBuffer);

  assert.deepEqual(diff.summary, {
    total: 3,
    added: 1,
    removed: 1,
    modified: 1
  });
  assert.equal(diff.result.find((item) => item.path === 'Users!B2')?.type, 'modified');
  assert.equal(diff.result.find((item) => item.path === 'Users!B2')?.meta.label, '单元格 Users!B2');
  assert.equal(diff.result.find((item) => item.path === 'Legacy')?.scope, 'sheet');
  assert.equal(diff.result.find((item) => item.path === 'Audit')?.type, 'added');
});

test('aligns excel rows by primary key before diffing', async () => {
  const leftBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name'],
        [1, 'Ada'],
        [2, 'Bob']
      ]
    }
  ]);
  const rightBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name'],
        [2, 'Bobby'],
        [1, 'Ada']
      ]
    }
  ]);
  const diff = await compareExcelBuffers(leftBuffer, rightBuffer, {
    ...defaultNormalizationOptions,
    enabled: true,
    tablePrimaryKeyColumns: ['id']
  });

  assert.deepEqual(diff.summary, {
    total: 1,
    added: 0,
    removed: 0,
    modified: 1
  });
  assert.equal(diff.result[0].path, 'Users!key(id=2).B');
  assert.equal(diff.result[0].leftValue, 'Bob');
  assert.equal(diff.result[0].rightValue, 'Bobby');
  assert.equal(diff.normalization.ignoredDifferences.length, 2);
});

test('applies advanced excel column and row ignore rules', async () => {
  const leftBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name', 'updatedAt'],
        [1, 'Ada', 'old'],
        [2, 'Bob', 'same']
      ]
    }
  ]);
  const rightBuffer = await createWorkbookBuffer([
    {
      name: 'Users',
      rows: [
        ['id', 'name', 'updatedAt'],
        [1, 'Ada', 'new'],
        [2, 'Bobby', 'same']
      ]
    }
  ]);
  const diff = await compareExcelBuffers(leftBuffer, rightBuffer, defaultNormalizationOptions, {
    ...defaultAdvancedRuleOptions,
    enabled: true,
    tableIgnoredColumns: ['updatedAt'],
    tableIgnoredRows: [3]
  });

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.advancedRules.ignoredDifferences.length, 2);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'tableColumn'), true);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'tableRow'), true);
});
