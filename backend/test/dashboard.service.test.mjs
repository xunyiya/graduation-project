import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-dashboard-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const { createCompareJob, saveCompareResult } = await import('../dist/services/compareJob.service.js');
const { createExportRecord } = await import('../dist/services/exportRecord.service.js');
const { createVersionChainRecord } = await import('../dist/services/versionChainRecord.service.js');
const { getDashboardStats } = await import('../dist/services/dashboard.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

function response(fileType, summary) {
  return {
    success: true,
    fileType,
    summary,
    result: [],
    filters: {
      options: {
        ignoreWhitespace: false,
        ignoreCase: false,
        ignoreComments: false
      },
      active: []
    },
    advancedRules: {
      enabled: false,
      options: {
        enabled: false,
        textIgnoredLineKeywords: [],
        textIgnoredRegexPatterns: [],
        jsonIgnoredFields: [],
        jsonIgnoredPaths: [],
        jsonIgnoreArrayOrder: false,
        tableIgnoredColumns: [],
        tableIgnoredRows: [],
        tableNumericTolerance: null
      },
      active: [],
      ignoredDifferences: [],
      warnings: []
    },
    normalization: {
      enabled: false,
      options: {
        enabled: false,
        ignoreJsonFieldOrder: false,
        ignoredJsonFields: [],
        emptyValuesEquivalent: false,
        numericTolerance: null,
        normalizeDateFormat: false,
        tablePrimaryKeyColumns: []
      },
      active: [],
      ignoredDifferences: [],
      warnings: []
    },
    performance: {
      algorithm: 'test',
      resultLimit: 5000,
      resultCount: summary.total,
      resultTruncated: false,
      warnings: []
    },
    message: 'ok',
    received: {}
  };
}

function trend() {
  return {
    intervalCount: 1,
    totalDifferences: 4,
    peakIntervalId: 'v1-v2',
    peakIntervalLabel: 'v1 -> v2',
    peakDifferenceCount: 4,
    added: 2,
    removed: 1,
    modified: 1,
    direction: 'stable'
  };
}

test('aggregates dashboard statistics from jobs, results, exports and version chains per user', async () => {
  const owner = await createUser(`dash-owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`dash-stranger-${crypto.randomUUID()}`, 'secret');
  const textJob = createCompareJob(owner.id, {
    title: '文本任务',
    fileType: 'text',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'text',
    resultCount: 3
  });
  const jsonJob = createCompareJob(owner.id, {
    title: 'JSON 任务',
    fileType: 'json',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'json',
    resultCount: 2
  });
  const strangerJob = createCompareJob(stranger.id, {
    title: '隔离任务',
    fileType: 'excel',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'excel',
    resultCount: 99
  });

  saveCompareResult(
    textJob.id,
    response('text', {
      total: 3,
      added: 1,
      removed: 1,
      modified: 1
    })
  );
  saveCompareResult(
    jsonJob.id,
    response('json', {
      total: 2,
      added: 2,
      removed: 0,
      modified: 0
    })
  );
  saveCompareResult(
    strangerJob.id,
    response('excel', {
      total: 99,
      added: 99,
      removed: 0,
      modified: 0
    })
  );
  createExportRecord(owner.id, {
    jobId: textJob.id,
    exportType: 'html',
    fileName: 'text.html',
    options: {}
  });
  createVersionChainRecord(owner.id, {
    title: '版本链',
    fileType: 'text',
    summary: {
      compareJobId: textJob.id,
      totalDifferences: 4
    },
    trend: trend()
  });

  const stats = getDashboardStats(owner.id);

  assert.equal(stats.totalTasks, 2);
  assert.equal(stats.fileTypeCounts.text, 1);
  assert.equal(stats.fileTypeCounts.json, 1);
  assert.equal(stats.fileTypeCounts.excel, 0);
  assert.equal(stats.totalDifferences, 5);
  assert.equal(stats.differenceTypeTotals.added, 3);
  assert.equal(stats.differenceTypeTotals.removed, 1);
  assert.equal(stats.differenceTypeTotals.modified, 1);
  assert.equal(stats.exportCount, 1);
  assert.equal(stats.versionChainCount, 1);
  assert.equal(stats.recent7DaysTrend.length, 7);
  assert.equal(stats.recent7DaysTaskCount, 2);
  assert.equal(stats.recentJobs.length, 2);
});
