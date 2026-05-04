import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-preset-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const {
  createFilterPreset,
  deleteFilterPreset,
  getFilterPresetById,
  listFilterPresets,
  setDefaultFilterPreset,
  updateFilterPreset
} = await import('../dist/services/filterPreset.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

function presetInput(overrides = {}) {
  return {
    name: '忽略更新时间',
    description: '忽略 updatedAt 和 timestamp 字段',
    fileType: 'json',
    filters: {
      ignoreWhitespace: true,
      ignoreCase: true,
      ignoreComments: false
    },
    advancedRules: {
      enabled: true,
      jsonIgnoredFields: ['updatedAt', 'timestamp']
    },
    normalization: {
      enabled: true,
      ignoreJsonFieldOrder: true
    },
    ...overrides
  };
}

test('stores, filters, defaults, updates and deletes filter presets per user', async () => {
  const owner = await createUser(`preset-owner-${crypto.randomUUID()}`, 'secret');
  const stranger = await createUser(`preset-stranger-${crypto.randomUUID()}`, 'secret');
  const first = createFilterPreset(owner.id, presetInput({ isDefault: true }));
  const second = createFilterPreset(
    owner.id,
    presetInput({
      name: '忽略状态字段',
      advancedRules: {
        enabled: true,
        jsonIgnoredFields: ['status']
      }
    })
  );

  assert.equal(first.isDefault, true);
  assert.equal(listFilterPresets(owner.id, 'json').length, 2);
  assert.equal(listFilterPresets(owner.id, 'text').length, 0);
  assert.equal(getFilterPresetById(stranger.id, first.id), null);

  const defaultPreset = setDefaultFilterPreset(owner.id, second.id);
  const refreshedFirst = getFilterPresetById(owner.id, first.id);

  assert.equal(defaultPreset.isDefault, true);
  assert.equal(refreshedFirst.isDefault, false);

  const updated = updateFilterPreset(owner.id, second.id, {
    name: '忽略业务状态',
    filters: {
      ignoreWhitespace: false,
      ignoreCase: true,
      ignoreComments: true
    }
  });

  assert.equal(updated.name, '忽略业务状态');
  assert.equal(updated.filters.ignoreComments, true);
  assert.equal(updateFilterPreset(stranger.id, second.id, { name: 'bad' }), null);
  assert.equal(deleteFilterPreset(stranger.id, second.id), false);
  assert.equal(deleteFilterPreset(owner.id, second.id), true);
  assert.equal(getFilterPresetById(owner.id, second.id), null);
});
