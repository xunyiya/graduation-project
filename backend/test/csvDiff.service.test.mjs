import assert from 'node:assert/strict';
import test from 'node:test';

import { compareCsvText } from '../dist/services/csvDiff.service.js';
import { parseCsvText } from '../dist/services/csvParser.service.js';
import { defaultAdvancedRuleOptions } from '../dist/services/advancedRules.service.js';
import { defaultNormalizationOptions } from '../dist/services/normalization.service.js';

test('parses csv text including quoted commas', () => {
  assert.deepEqual(parseCsvText('id,name\n1,"Ada, Lovelace"'), [
    ['id', 'name'],
    ['1', 'Ada, Lovelace']
  ]);
});

test('detects csv cell modifications and added cells', () => {
  const diff = compareCsvText('id,name\n1,Ada\n2,Bob', 'id,name\n1,Ada Lovelace\n2,Bob\n3,Grace');

  assert.deepEqual(diff.summary, {
    total: 3,
    added: 2,
    removed: 0,
    modified: 1
  });
  assert.equal(diff.result.find((item) => item.path === 'R2CB')?.type, 'modified');
  assert.equal(diff.result.find((item) => item.path === 'R2CB')?.meta.location.kind, 'table');
  assert.equal(diff.result.find((item) => item.path === 'R4CA')?.type, 'added');
  assert.equal(diff.result.find((item) => item.path === 'R4CB')?.rightValue, 'Grace');
  assert.equal(diff.performance.algorithm, 'csv-cell-scan');
});

test('aligns csv rows by primary key before diffing', () => {
  const diff = compareCsvText(
    'id,name\n1,Ada\n2,Bob',
    'id,name\n2,Bobby\n1,Ada',
    {
      ...defaultNormalizationOptions,
      enabled: true,
      tablePrimaryKeyColumns: ['id']
    }
  );

  assert.deepEqual(diff.summary, {
    total: 1,
    added: 0,
    removed: 0,
    modified: 1
  });
  assert.equal(diff.result[0].path, 'key(id=2).B');
  assert.equal(diff.result[0].leftValue, 'Bob');
  assert.equal(diff.result[0].rightValue, 'Bobby');
  assert.equal(diff.performance.algorithm, 'csv-primary-key-cell-scan');
  assert.equal(diff.normalization.ignoredDifferences.length, 2);
  assert.equal(diff.normalization.ignoredDifferences[0].rule, 'tablePrimaryKey');
});

test('applies advanced csv column, row and numeric tolerance ignore rules', () => {
  const diff = compareCsvText(
    'id,name,score,updatedAt\n1,Ada,10.00,old\n2,Bob,5,keep',
    'id,name,score,updatedAt\n1,Ada,10.01,new\n2,Bobby,5,keep',
    defaultNormalizationOptions,
    {
      ...defaultAdvancedRuleOptions,
      enabled: true,
      tableIgnoredColumns: ['updatedAt'],
      tableIgnoredRows: [3],
      tableNumericTolerance: 0.02
    }
  );

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.advancedRules.ignoredDifferences.length, 3);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'tableColumn'), true);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'tableRow'), true);
  assert.equal(
    diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'tableNumericTolerance'),
    true
  );
});
