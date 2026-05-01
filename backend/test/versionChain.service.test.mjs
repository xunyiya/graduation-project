import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultAdvancedRuleOptions } from '../dist/services/advancedRules.service.js';
import { buildFilterInfo, defaultFilterOptions } from '../dist/services/filter.service.js';
import { defaultNormalizationOptions } from '../dist/services/normalization.service.js';
import { compareVersionChain } from '../dist/services/versionChain.service.js';

function textVersion(fileName, text) {
  const buffer = Buffer.from(text);

  return {
    buffer,
    fileName,
    label: fileName.replace(/\.[^.]+$/, ''),
    size: buffer.byteLength,
    text
  };
}

test('compares a text version chain interval by interval', async () => {
  const response = await compareVersionChain({
    advancedRuleOptions: defaultAdvancedRuleOptions,
    fileType: 'text',
    filterInfo: buildFilterInfo(defaultFilterOptions),
    filterOptions: defaultFilterOptions,
    normalizationOptions: defaultNormalizationOptions,
    versions: [
      textVersion('v1.txt', 'title: demo\nstatus: draft'),
      textVersion('v2.txt', 'title: demo\nstatus: review'),
      textVersion('v3.txt', 'title: demo\nstatus: review\nowner: team-a')
    ]
  });

  assert.equal(response.success, true);
  assert.equal(response.versions.length, 3);
  assert.equal(response.intervals.length, 2);
  assert.equal(response.intervals[0].label, 'v1 -> v2');
  assert.equal(response.intervals[0].summary.modified, 1);
  assert.equal(response.intervals[1].summary.added, 1);
  assert.equal(response.trend.totalDifferences, 2);
  assert.equal(response.trend.intervalCount, 2);
});

test('compares a json version chain with structured results', async () => {
  const response = await compareVersionChain({
    advancedRuleOptions: defaultAdvancedRuleOptions,
    fileType: 'json',
    filterInfo: buildFilterInfo(defaultFilterOptions),
    filterOptions: defaultFilterOptions,
    normalizationOptions: defaultNormalizationOptions,
    versions: [
      textVersion('v1.json', '{"name":"demo","version":1}'),
      textVersion('v2.json', '{"name":"demo","version":2,"enabled":true}'),
      textVersion('v3.json', '{"name":"demo-next","version":2,"enabled":true}')
    ]
  });

  assert.equal(response.fileType, 'json');
  assert.equal(response.intervals.length, 2);
  assert.equal(response.intervals[0].summary.added, 1);
  assert.equal(response.intervals[0].summary.modified, 1);
  assert.equal(response.intervals[1].summary.modified, 1);
  assert.equal(response.intervals[0].result[0].kind, 'json-node');
  assert.equal(response.trend.added, 1);
  assert.equal(response.trend.modified, 2);
});
