import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExportHtml, buildExportPdf } from '../dist/services/export.service.js';

const compareResult = {
  success: true,
  fileType: 'text',
  summary: {
    total: 1,
    added: 0,
    removed: 0,
    modified: 1
  },
  result: [
    {
      kind: 'text-line',
      id: 1,
      type: 'modified',
      meta: {
        diffId: 'text-1',
        kind: 'text-line',
        type: 'modified',
        label: '第 1 行',
        path: 'line:1',
        location: {
          kind: 'text',
          lineNumber: 1
        },
        leftValue: 'old',
        rightValue: 'new'
      },
      left: null,
      right: null
    }
  ],
  filters: {
    options: {
      ignoreWhitespace: false,
      ignoreCase: false,
      ignoreComments: false
    },
    active: []
  },
  message: 'ok',
  received: {
    leftFile: 'left.txt',
    rightFile: 'right.txt'
  }
};

test('builds html export with summary and selected diff', () => {
  const html = buildExportHtml({
    compareResult,
    selectedDiffId: 'text-1',
    options: {
      exportAllDifferences: false,
      includeSummary: true,
      includeFileInfo: true
    }
  });

  assert.equal(html.includes('数据差异对比报告'), true);
  assert.equal(html.includes('line:1'), true);
  assert.equal(html.includes('left.txt'), true);
});

test('builds pdf export buffer', async () => {
  const pdf = await buildExportPdf({
    compareResult,
    options: {
      exportAllDifferences: true,
      includeSummary: true,
      includeFileInfo: true
    }
  });

  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
});
