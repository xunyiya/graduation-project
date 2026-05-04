import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-settings-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { closeDatabase } = await import('../dist/services/database.service.js');
const { createUser } = await import('../dist/services/user.service.js');
const {
  ensureUserSettings,
  getUserSettings,
  resetUserSettings,
  updateUserSettings
} = await import('../dist/services/userSettings.service.js');

after(async () => {
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

test('reads, updates and resets user settings', async () => {
  const user = await createUser(`settings-${crypto.randomUUID()}`, 'secret');
  const initial = getUserSettings(user.id);

  assert.equal(initial.defaultFileType, 'auto');
  assert.equal(initial.theme, 'light');

  const ensured = ensureUserSettings(user.id);

  assert.equal(ensured.userId, user.id);

  const updated = updateUserSettings(user.id, {
    defaultFileType: 'json',
    defaultFilters: {
      ignoreWhitespace: true,
      ignoreCase: true,
      ignoreComments: false
    },
    defaultAdvancedRules: {
      enabled: true,
      jsonIgnoredFields: ['updatedAt']
    },
    defaultNormalization: {
      enabled: true,
      numericTolerance: 0.01
    },
    theme: 'dark'
  });

  assert.equal(updated.defaultFileType, 'json');
  assert.equal(updated.defaultFilters.ignoreWhitespace, true);
  assert.deepEqual(updated.defaultAdvancedRules.jsonIgnoredFields, ['updatedAt']);
  assert.equal(updated.defaultNormalization.numericTolerance, 0.01);
  assert.equal(updated.theme, 'dark');

  const reset = resetUserSettings(user.id);

  assert.equal(reset.defaultFileType, 'auto');
  assert.equal(reset.defaultFilters.ignoreWhitespace, false);
  assert.equal(reset.theme, 'light');
});
