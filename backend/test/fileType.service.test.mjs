import assert from 'node:assert/strict';
import test from 'node:test';

import { detectFileType, normalizeRequestedFileType } from '../dist/services/fileType.service.js';

test('normalizes supported request file types', () => {
  assert.equal(normalizeRequestedFileType(undefined), 'auto');
  assert.equal(normalizeRequestedFileType('auto'), 'auto');
  assert.equal(normalizeRequestedFileType('text'), 'text');
  assert.equal(normalizeRequestedFileType('json'), 'json');
  assert.equal(normalizeRequestedFileType('csv'), 'csv');
  assert.equal(normalizeRequestedFileType('excel'), 'excel');
  assert.equal(normalizeRequestedFileType('pdf'), null);
});

test('detects json by uploaded file extension', () => {
  assert.equal(
    detectFileType({
      requestedFileType: 'auto',
      leftFileName: 'left.json',
      rightFileName: 'right.json',
      leftText: 'not parsed here',
      rightText: 'not parsed here'
    }),
    'json'
  );
});

test('detects pasted json when both sides are valid json values', () => {
  assert.equal(
    detectFileType({
      requestedFileType: 'auto',
      leftText: '{"name":"left"}',
      rightText: '{"name":"right"}'
    }),
    'json'
  );
});

test('falls back to text for non-json input', () => {
  assert.equal(
    detectFileType({
      requestedFileType: 'auto',
      leftText: 'plain text',
      rightText: 'plain text'
    }),
    'text'
  );
});

test('detects csv and excel by uploaded file extension', () => {
  assert.equal(
    detectFileType({
      requestedFileType: 'auto',
      leftFileName: 'left.csv',
      rightFileName: 'right.csv',
      leftText: '',
      rightText: ''
    }),
    'csv'
  );
  assert.equal(
    detectFileType({
      requestedFileType: 'auto',
      leftFileName: 'left.xlsx',
      rightFileName: 'right.xlsx',
      leftText: '',
      rightText: ''
    }),
    'excel'
  );
});
