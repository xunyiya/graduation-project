import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultAdvancedRuleOptions } from '../dist/services/advancedRules.service.js';
import { compareTextLines } from '../dist/services/textDiff.service.js';

test('returns no differences for identical text', () => {
  const diff = compareTextLines('alpha\nbeta', 'alpha\nbeta');

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.result.length, 2);
  assert.equal(diff.result[0].type, 'unchanged');
});

test('counts added lines without shifting unchanged lines', () => {
  const diff = compareTextLines('alpha\nbeta', 'alpha\ninserted\nbeta');

  assert.deepEqual(diff.summary, {
    total: 1,
    added: 1,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.result[1].type, 'added');
  assert.equal(diff.result[1].meta.kind, 'text-line');
  assert.equal(diff.result[1].meta.path, 'line:2');
  assert.equal(diff.result[2].type, 'unchanged');
});

test('counts removed and modified lines', () => {
  const diff = compareTextLines('alpha\nold\nremove-me\nomega', 'alpha\nnew\nomega');

  assert.deepEqual(diff.summary, {
    total: 2,
    added: 0,
    removed: 1,
    modified: 1
  });
  assert.equal(diff.result[1].type, 'modified');
  assert.equal(diff.result[2].type, 'removed');
});

test('returns inline changed segments for modified lines', () => {
  const diff = compareTextLines('count=1', 'count=2');
  const modifiedRow = diff.result[0];

  assert.equal(modifiedRow.type, 'modified');
  assert.equal(
    modifiedRow.left.segments.some((segment) => segment.type === 'changed' && segment.text === '1'),
    true
  );
  assert.equal(
    modifiedRow.right.segments.some((segment) => segment.type === 'changed' && segment.text === '2'),
    true
  );
});

test('ignores whitespace differences during preprocessing', () => {
  const diff = compareTextLines('const value = 1', 'constvalue=1', {
    ignoreWhitespace: true,
    ignoreCase: false,
    ignoreComments: false
  });

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
});

test('ignores case differences during preprocessing', () => {
  const diff = compareTextLines('Project Name', 'project name', {
    ignoreWhitespace: false,
    ignoreCase: true,
    ignoreComments: false
  });

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
});

test('ignores single-line comments during preprocessing', () => {
  const diff = compareTextLines('value = 1 // old comment\nnext # left', 'value = 1 # new comment\nnext', {
    ignoreWhitespace: false,
    ignoreCase: false,
    ignoreComments: true
  });

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
});

test('switches to linear comparison for large text inputs', () => {
  const left = Array.from({ length: 1500 }, (_, index) => `line-${index}`).join('\n');
  const right = Array.from({ length: 1500 }, (_, index) =>
    index === 1499 ? `line-${index}-changed` : `line-${index}`
  ).join('\n');
  const diff = compareTextLines(left, right);

  assert.equal(diff.performance.algorithm, 'text-line-by-line');
  assert.equal(diff.summary.modified, 1);
  assert.equal(diff.result.length, 1);
});

test('applies advanced text keyword and regex ignore rules', () => {
  const diff = compareTextLines(
    'alpha\ndebug generated at 10:00\nversion=123',
    'alpha\nversion=456',
    {
      ignoreWhitespace: false,
      ignoreCase: false,
      ignoreComments: false
    },
    {
      ...defaultAdvancedRuleOptions,
      enabled: true,
      textIgnoredLineKeywords: ['debug'],
      textIgnoredRegexPatterns: ['version=\\d+']
    }
  );

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.advancedRules.ignoredDifferences.length, 3);
  assert.equal(
    diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'textLineKeyword'),
    true
  );
  assert.equal(
    diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'textRegexContent'),
    true
  );
});
