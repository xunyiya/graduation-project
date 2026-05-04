import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-version-chain-record-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase, database } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const { createUploadedFileRecord } = await import('../dist/services/fileRecord.service.js');
const {
  attachVersionChainFile,
  createVersionChainRecord,
  deleteVersionChainById,
  getVersionChainById,
  listVersionChains
} = await import('../dist/services/versionChainRecord.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

function trend() {
  return {
    intervalCount: 2,
    totalDifferences: 5,
    peakIntervalId: 'v2-v3',
    peakIntervalLabel: 'v2 -> v3',
    peakDifferenceCount: 4,
    added: 2,
    removed: 1,
    modified: 2,
    direction: 'mixed'
  };
}

test('stores version chains and version files with owner isolation', async () => {
  const owner = await createUser(`chain-owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`chain-stranger-${crypto.randomUUID()}`, 'secret');
  const fileRecord = createUploadedFileRecord(owner.id, {
    originalName: 'v1.txt',
    fileType: 'text',
    sizeBytes: 10,
    sourceType: 'version-compare-upload'
  });
  const chain = createVersionChainRecord(owner.id, {
    title: '文本多版本链',
    fileType: 'text',
    summary: {
      compareJobId: 12,
      versionCount: 3,
      totalDifferences: 5
    },
    trend: trend()
  });

  attachVersionChainFile(chain.id, {
    fileId: fileRecord.id,
    versionIndex: 0,
    versionLabel: 'v1',
    fileName: 'v1.txt'
  });
  attachVersionChainFile(chain.id, {
    versionIndex: 1,
    versionLabel: 'v2',
    fileName: 'v2.txt'
  });

  const restored = getVersionChainById(owner.id, chain.id);

  assert.equal(restored.files.length, 2);
  assert.equal(restored.trend.totalDifferences, 5);
  assert.equal(restored.summary.versionCount, 3);
  assert.equal(listVersionChains(owner.id).length, 1);
  assert.equal(getVersionChainById(stranger.id, chain.id), null);
  assert.equal(deleteVersionChainById(stranger.id, chain.id), false);
  assert.equal(deleteVersionChainById(owner.id, chain.id), true);
  assert.equal(getVersionChainById(owner.id, chain.id), null);
  assert.equal(
    database.prepare('SELECT COUNT(*) AS count FROM version_chain_files WHERE chain_id = ?').get(chain.id).count,
    0
  );
});
