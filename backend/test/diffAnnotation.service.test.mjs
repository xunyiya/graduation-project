import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-annotation-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const { createCompareJob } = await import('../dist/services/compareJob.service.js');
const {
  createAnnotation,
  deleteAnnotation,
  getAnnotationByDiffId,
  listAnnotationsByJob,
  updateAnnotation
} = await import('../dist/services/diffAnnotation.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

test('adds, reads, updates and deletes annotations for one diffId per owner', async () => {
  const owner = await createUser(`annotation-owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`annotation-stranger-${crypto.randomUUID()}`, 'secret');
  const job = createCompareJob(owner.id, {
    title: '备注任务',
    fileType: 'text',
    inputMode: 'pair',
    status: 'completed',
    algorithm: 'text-lcs',
    resultCount: 1
  });
  const annotation = createAnnotation(owner.id, {
    jobId: job.id,
    diffId: 'text-1',
    note: '这个字段需要复查',
    tag: '待复查',
    resolved: false
  });

  assert.equal(annotation.diffId, 'text-1');
  assert.equal(annotation.resolved, false);
  assert.equal(listAnnotationsByJob(owner.id, job.id).length, 1);
  assert.equal(listAnnotationsByJob(stranger.id, job.id), null);
  assert.equal(getAnnotationByDiffId(owner.id, job.id, 'text-1').note, '这个字段需要复查');

  const updated = updateAnnotation(owner.id, annotation.id, {
    note: '这个差异已确认',
    tag: '已确认',
    resolved: true
  });

  assert.equal(updated.tag, '已确认');
  assert.equal(updated.resolved, true);
  assert.equal(updateAnnotation(stranger.id, annotation.id, { note: 'bad' }), null);
  assert.equal(deleteAnnotation(stranger.id, annotation.id), false);
  assert.equal(deleteAnnotation(owner.id, annotation.id), true);
  assert.equal(getAnnotationByDiffId(owner.id, job.id, 'text-1'), null);
});
