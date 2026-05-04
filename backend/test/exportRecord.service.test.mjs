import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-export-record-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const { createCompareJob, deleteCompareJobById } = await import('../dist/services/compareJob.service.js');
const {
  createExportRecord,
  deleteExportRecord,
  listExportRecords,
  listExportRecordsByJob
} = await import('../dist/services/exportRecord.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

test('stores export records, filters by job and isolates users', async () => {
  const owner = await createUser(`export-owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`export-stranger-${crypto.randomUUID()}`, 'secret');
  const job = createCompareJob(owner.id, {
    title: '导出任务',
    fileType: 'text',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'text-linear',
    resultCount: 3
  });
  const linked = createExportRecord(owner.id, {
    jobId: job.id,
    exportType: 'html',
    fileName: 'report.html',
    options: {
      exportAllDifferences: true,
      includeSummary: true,
      includeFileInfo: false
    }
  });
  const loose = createExportRecord(owner.id, {
    jobId: null,
    exportType: 'pdf',
    fileName: 'report.pdf',
    options: {}
  });

  assert.equal(linked.jobId, job.id);
  assert.equal(linked.jobTitle, '导出任务');
  assert.equal(loose.jobId, null);
  assert.equal(listExportRecords(owner.id).length, 2);
  assert.equal(listExportRecordsByJob(owner.id, job.id).length, 1);
  assert.equal(listExportRecordsByJob(stranger.id, job.id), null);
  assert.equal(
    createExportRecord(stranger.id, {
      jobId: job.id,
      exportType: 'html',
      fileName: 'bad.html',
      options: {}
    }),
    null
  );

  deleteCompareJobById(owner.id, job.id);

  assert.equal(listExportRecords(owner.id).find((record) => record.id === linked.id).jobId, null);
  assert.equal(deleteExportRecord(stranger.id, loose.id), false);
  assert.equal(deleteExportRecord(owner.id, loose.id), true);
});
