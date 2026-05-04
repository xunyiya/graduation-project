import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-compare-job-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const {
  attachJobFile,
  createCompareJob,
  deleteCompareJobById,
  getCompareJobById,
  listCompareJobs,
  saveCompareResult
} = await import('../dist/services/compareJob.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

function compareResponse() {
  return {
    success: true,
    fileType: 'json',
    summary: {
      total: 2,
      added: 1,
      removed: 0,
      modified: 1
    },
    result: [
      {
        kind: 'json-node',
        id: '$.name',
        type: 'modified',
        meta: {
          diffId: 'json-1',
          kind: 'json-node',
          type: 'modified',
          label: 'name',
          path: '$.name',
          location: {
            kind: 'json',
            path: '$.name'
          },
          leftValue: 'old',
          rightValue: 'new'
        },
        key: 'name',
        path: '$.name',
        valueType: 'string',
        leftValue: 'old',
        rightValue: 'new',
        leftPreview: '"old"',
        rightPreview: '"new"',
        children: []
      }
    ],
    filters: {
      options: {
        ignoreWhitespace: true,
        ignoreCase: false,
        ignoreComments: false
      },
      active: [{ key: 'ignoreWhitespace', label: '忽略空白' }]
    },
    advancedRules: {
      enabled: true,
      options: {
        enabled: true,
        textIgnoredLineKeywords: [],
        textIgnoredRegexPatterns: [],
        jsonIgnoredFields: ['updatedAt'],
        jsonIgnoredPaths: [],
        jsonIgnoreArrayOrder: false,
        tableIgnoredColumns: [],
        tableIgnoredRows: [],
        tableNumericTolerance: null
      },
      active: [{ key: 'jsonField', label: '忽略 JSON 字段' }],
      ignoredDifferences: [],
      warnings: []
    },
    normalization: {
      enabled: true,
      options: {
        enabled: true,
        ignoreJsonFieldOrder: true,
        ignoredJsonFields: [],
        emptyValuesEquivalent: false,
        numericTolerance: null,
        normalizeDateFormat: false,
        tablePrimaryKeyColumns: []
      },
      active: [{ key: 'jsonFieldOrder', label: '忽略 JSON 字段顺序' }],
      ignoredDifferences: [],
      warnings: []
    },
    performance: {
      algorithm: 'json-tree',
      resultLimit: 5000,
      resultCount: 2,
      resultTruncated: false,
      warnings: []
    },
    message: 'ok',
    received: {
      leftFile: 'left.json',
      rightFile: 'right.json'
    }
  };
}

test('creates, lists, reads and deletes compare jobs with complete JSON results', async () => {
  const owner = await createUser(`owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`stranger-${crypto.randomUUID()}`, 'secret');
  const job = createCompareJob(owner.id, {
    title: 'JSON 对比',
    fileType: 'json',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'json-tree',
    durationMs: 42,
    resultCount: 2,
    resultTruncated: false
  });

  attachJobFile(job.id, {
    role: 'left',
    versionIndex: null,
    displayName: 'left.json'
  });
  attachJobFile(job.id, {
    role: 'right',
    versionIndex: null,
    displayName: 'right.json'
  });

  const savedResult = saveCompareResult(job.id, compareResponse());
  const restored = getCompareJobById(owner.id, job.id);

  assert.equal(savedResult.summary.total, 2);
  assert.equal(savedResult.resultJson[0].meta.diffId, 'json-1');
  assert.equal(restored.files.length, 2);
  assert.equal(restored.result.summary.added, 1);
  assert.equal(restored.result.resultJson[0].rightPreview, '"new"');
  assert.equal(listCompareJobs(owner.id).some((item) => item.id === job.id), true);
  assert.equal(getCompareJobById(stranger.id, job.id), null);
  assert.equal(deleteCompareJobById(stranger.id, job.id), false);
  assert.equal(deleteCompareJobById(owner.id, job.id), true);
  assert.equal(getCompareJobById(owner.id, job.id), null);
});
