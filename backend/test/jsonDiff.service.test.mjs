import assert from 'node:assert/strict';
import test from 'node:test';

import { compareJsonText, compareJsonValues } from '../dist/services/jsonDiff.service.js';
import { defaultAdvancedRuleOptions } from '../dist/services/advancedRules.service.js';
import { defaultNormalizationOptions } from '../dist/services/normalization.service.js';

test('detects added, removed and modified json nodes', () => {
  const diff = compareJsonValues(
    {
      name: 'alpha',
      version: 1,
      legacy: true,
      nested: {
        keep: 'same'
      }
    },
    {
      name: 'alpha',
      version: 2,
      enabled: true,
      nested: {
        keep: 'same'
      }
    }
  );

  assert.deepEqual(diff.summary, {
    total: 3,
    added: 1,
    removed: 1,
    modified: 1
  });
  assert.equal(diff.result[0].kind, 'json-node');
  assert.equal(diff.result[0].meta.path, '$');
  assert.equal(diff.result[0].children.find((node) => node.path === '$.enabled')?.type, 'added');
  assert.equal(diff.result[0].children.find((node) => node.path === '$.legacy')?.type, 'removed');
  assert.equal(diff.result[0].children.find((node) => node.path === '$.version')?.type, 'modified');
});

test('diffs array items by index and keeps node paths', () => {
  const diff = compareJsonValues({ users: [{ id: 1, name: 'Ada' }] }, { users: [{ id: 1, name: 'Grace' }] });
  const userNameNode = diff.result[0].children[0].children[0].children.find(
    (node) => node.path === '$.users[0].name'
  );

  assert.equal(userNameNode?.type, 'modified');
  assert.equal(userNameNode?.leftPreview, '"Ada"');
  assert.equal(userNameNode?.rightPreview, '"Grace"');
});

test('parses json text before comparing', () => {
  const diff = compareJsonText('{"a":1}', '{"a":1,"b":2}');

  assert.deepEqual(diff.summary, {
    total: 1,
    added: 1,
    removed: 0,
    modified: 0
  });
});

test('normalizes json before diffing and records ignored differences', () => {
  const diff = compareJsonValues(
    {
      amount: 1.004,
      meta: {
        date: '2026-04-29',
        updatedAt: '2026-04-29T09:00:00Z'
      },
      optional: null,
      payload: {
        b: 2,
        a: 1
      }
    },
    {
      amount: 1.009,
      meta: {
        date: '2026/04/29',
        updatedAt: '2026-04-30T10:00:00Z'
      },
      optional: '',
      payload: {
        a: 1,
        b: 2
      }
    },
    {
      ...defaultNormalizationOptions,
      enabled: true,
      ignoreJsonFieldOrder: true,
      ignoredJsonFields: ['updatedAt'],
      emptyValuesEquivalent: true,
      numericTolerance: 0.01,
      normalizeDateFormat: true
    }
  );

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.normalization.enabled, true);
  assert.equal(diff.normalization.ignoredDifferences.length, 4);
  assert.equal(
    diff.normalization.ignoredDifferences.some((item) => item.path === '$.meta.updatedAt'),
    true
  );
  assert.equal(
    diff.normalization.ignoredDifferences.some((item) => item.rule === 'numericTolerance'),
    true
  );
});

test('applies advanced json field, path and array-order ignore rules', () => {
  const diff = compareJsonValues(
    {
      user: {
        name: 'Ada',
        profile: {
          lastLogin: '2026-04-28'
        }
      },
      tags: ['beta', 'alpha'],
      traceId: 'left-1'
    },
    {
      user: {
        name: 'Ada',
        profile: {
          lastLogin: '2026-04-29'
        }
      },
      tags: ['alpha', 'beta'],
      traceId: 'right-1'
    },
    defaultNormalizationOptions,
    {
      ...defaultAdvancedRuleOptions,
      enabled: true,
      jsonIgnoredFields: ['traceId'],
      jsonIgnoredPaths: ['user.profile.lastLogin'],
      jsonIgnoreArrayOrder: true
    }
  );

  assert.deepEqual(diff.summary, {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  });
  assert.equal(diff.advancedRules.ignoredDifferences.length, 3);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'jsonField'), true);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'jsonPath'), true);
  assert.equal(diff.advancedRules.ignoredDifferences.some((item) => item.rule === 'jsonArrayOrder'), true);
});
