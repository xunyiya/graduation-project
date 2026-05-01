import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFilterInfo,
  normalizeComparableText,
  normalizeFilterOptions
} from '../dist/services/filter.service.js';

test('normalizes form checkbox values into filter options', () => {
  assert.deepEqual(
    normalizeFilterOptions({
      ignoreWhitespace: 'true',
      ignoreCase: 'on',
      ignoreComments: undefined
    }),
    {
      ignoreWhitespace: true,
      ignoreCase: true,
      ignoreComments: false
    }
  );
});

test('normalizes comparable text for reusable filtering', () => {
  assert.equal(
    normalizeComparableText('Value = 1 // trailing comment', {
      ignoreWhitespace: true,
      ignoreCase: true,
      ignoreComments: true
    }),
    'value=1'
  );
});

test('returns active filter labels for API display', () => {
  const filterInfo = buildFilterInfo({
    ignoreWhitespace: false,
    ignoreCase: true,
    ignoreComments: true
  });

  assert.deepEqual(
    filterInfo.active.map((filter) => filter.label),
    ['忽略大小写差异', '忽略注释内容']
  );
});
