import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'data-diff-auth-'));
process.env.DATABASE_PATH = path.join(tempDir, 'app.db');
process.env.JWT_SECRET = 'test-secret';

const { createApp } = await import('../dist/app.js');
const { closeDatabase } = await import('../dist/services/database.service.js');
const {
  computeSha256FromBuffer,
  createUploadedFileRecord
} = await import('../dist/services/fileRecord.service.js');

const app = createApp();
const server = app.listen(0);
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  closeDatabase();
  await rm(tempDir, { recursive: true, force: true });
});

function uniqueUsername(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function request(method, url, { body, token } = {}) {
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();

  return {
    status: response.status,
    json
  };
}

async function register(username = uniqueUsername('user'), password = 'secret') {
  const response = await request('POST', '/api/auth/register', {
    body: {
      username,
      password
    }
  });

  return {
    response,
    token: response.json.data?.token,
    username,
    password
  };
}

function buildCompareResult() {
  return {
    success: true,
    fileType: 'text',
    summary: {
      total: 1,
      added: 0,
      removed: 0,
      modified: 1
    },
    result: [],
    filters: {
      options: {
        ignoreWhitespace: false,
        ignoreCase: false,
        ignoreComments: false
      },
      active: []
    },
    performance: {
      algorithm: 'test',
      resultLimit: 5000,
      resultCount: 1,
      resultTruncated: false,
      warnings: []
    },
    message: 'ok',
    received: {
      leftFile: 'left.txt',
      rightFile: 'right.txt'
    }
  };
}

test('registers a user without returning passwordHash', async () => {
  const { response } = await register();

  assert.equal(response.status, 201);
  assert.equal(response.json.success, true);
  assert.equal(typeof response.json.data.token, 'string');
  assert.equal(typeof response.json.data.user.id, 'number');
  assert.equal('passwordHash' in response.json.data.user, false);
});

test('rejects duplicate usernames', async () => {
  const username = uniqueUsername('duplicate');
  await register(username);
  const duplicate = await request('POST', '/api/auth/register', {
    body: {
      username,
      password: 'secret'
    }
  });

  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.json.success, false);
});

test('logs in with valid credentials and rejects invalid credentials', async () => {
  const username = uniqueUsername('login');
  await register(username, 'right-password');

  const success = await request('POST', '/api/auth/login', {
    body: {
      username,
      password: 'right-password'
    }
  });
  const failure = await request('POST', '/api/auth/login', {
    body: {
      username,
      password: 'wrong-password'
    }
  });

  assert.equal(success.status, 200);
  assert.equal(typeof success.json.data.token, 'string');
  assert.equal(failure.status, 401);
});

test('returns 401 for unauthenticated history access', async () => {
  const response = await request('GET', '/api/history');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated file record access', async () => {
  const response = await request('GET', '/api/files');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated compare job access', async () => {
  const response = await request('GET', '/api/jobs');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated filter preset access', async () => {
  const response = await request('GET', '/api/filter-presets');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated settings access', async () => {
  const response = await request('GET', '/api/settings');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated export record access', async () => {
  const response = await request('GET', '/api/export-records');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated version chain access', async () => {
  const response = await request('GET', '/api/version-chains');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('returns 401 for unauthenticated dashboard access', async () => {
  const response = await request('GET', '/api/dashboard');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
});

test('lets a logged-in user create, read and delete own history records', async () => {
  const { token } = await register(uniqueUsername('history-owner'));
  const createResponse = await request('POST', '/api/history', {
    token,
    body: {
      compareResult: buildCompareResult()
    }
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.data.fileNames.left, 'left.txt');

  const recordId = createResponse.json.data.id;
  const listResponse = await request('GET', '/api/history', { token });
  const getResponse = await request('GET', `/api/history/${recordId}`, { token });
  const deleteResponse = await request('DELETE', `/api/history/${recordId}`, { token });
  const deletedGetResponse = await request('GET', `/api/history/${recordId}`, { token });

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.data.some((record) => record.id === recordId), true);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.data.compareResult.summary.modified, 1);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedGetResponse.status, 404);
});

test('prevents user A from reading or deleting user B history records', async () => {
  const userA = await register(uniqueUsername('user-a'));
  const userB = await register(uniqueUsername('user-b'));
  const createResponse = await request('POST', '/api/history', {
    token: userB.token,
    body: {
      compareResult: buildCompareResult()
    }
  });
  const recordId = createResponse.json.data.id;

  const readAsA = await request('GET', `/api/history/${recordId}`, {
    token: userA.token
  });
  const deleteAsA = await request('DELETE', `/api/history/${recordId}`, {
    token: userA.token
  });
  const readAsB = await request('GET', `/api/history/${recordId}`, {
    token: userB.token
  });

  assert.equal(readAsA.status, 404);
  assert.equal(deleteAsA.status, 404);
  assert.equal(readAsB.status, 200);
});

test('lets a logged-in user list, read and delete own file records safely', async () => {
  const otherUser = await register(uniqueUsername('file-other'));
  const otherOwner = await request('GET', '/api/auth/me', { token: otherUser.token });
  const { token } = await register(uniqueUsername('file-owner'));
  const sha256 = computeSha256FromBuffer(Buffer.from('hello file'));
  const createdRecord = createUploadedFileRecord(otherOwner.json.data.user.id, {
    originalName: 'private-left.txt',
    storedName: 'internal-private-left.txt',
    fileType: 'text',
    mimeType: 'text/plain',
    sizeBytes: 10,
    sha256,
    storagePath: '/private/uploads/internal-private-left.txt',
    sourceType: 'upload'
  });

  const owner = await request('GET', '/api/auth/me', { token });
  const userId = owner.json.data.user.id;
  const ownedRecord = createUploadedFileRecord(userId, {
    originalName: 'visible-left.txt',
    storedName: 'internal-visible-left.txt',
    fileType: 'text',
    mimeType: 'text/plain',
    sizeBytes: 12,
    sha256,
    storagePath: '/private/uploads/internal-visible-left.txt',
    sourceType: 'compare-upload'
  });

  const listResponse = await request('GET', '/api/files', { token });
  const recordId = String(ownedRecord.id);
  const listedRecord = listResponse.json.data.find((record) => record.id === recordId);
  const getResponse = await request('GET', `/api/files/${recordId}`, { token });
  const otherGetResponse = await request('GET', `/api/files/${createdRecord.id}`, { token });
  const deleteResponse = await request('DELETE', `/api/files/${recordId}`, { token });
  const deletedGetResponse = await request('GET', `/api/files/${recordId}`, { token });

  assert.equal(listResponse.status, 200);
  assert.equal(Boolean(listedRecord), true);
  assert.equal(listedRecord.fileName, 'visible-left.txt');
  assert.equal(listedRecord.sha256Prefix, sha256.slice(0, 12));
  assert.equal('storagePath' in listedRecord, false);
  assert.equal('storedName' in listedRecord, false);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.data.fileName, 'visible-left.txt');
  assert.equal(otherGetResponse.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedGetResponse.status, 404);
});

test('records uploaded file metadata after authenticated compare', async () => {
  const { token } = await register(uniqueUsername('compare-file-owner'));
  const leftContent = 'alpha\nbeta\n';
  const rightContent = 'alpha\ngamma\n';
  const formData = new FormData();

  formData.append('fileType', 'text');
  formData.append('leftFile', new Blob([leftContent], { type: 'text/plain' }), 'left.txt');
  formData.append('rightFile', new Blob([rightContent], { type: 'text/plain' }), 'right.txt');

  const compareResponse = await fetch(`${baseUrl}/api/diff/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  const compareJson = await compareResponse.json();
  const listResponse = await request('GET', '/api/files', { token });
  const fileNames = listResponse.json.data.map((record) => record.fileName);

  assert.equal(compareResponse.status, 200);
  assert.equal(compareJson.success, true);
  assert.equal(typeof compareJson.jobId, 'string');
  assert.equal(fileNames.includes('left.txt'), true);
  assert.equal(fileNames.includes('right.txt'), true);
  assert.equal(
    listResponse.json.data.some(
      (record) =>
        record.fileName === 'left.txt' &&
        record.sourceType === 'compare-upload' &&
        record.sha256Prefix === computeSha256FromBuffer(Buffer.from(leftContent)).slice(0, 12)
    ),
    true
  );
});

test('creates compare job and restores full pair result after authenticated compare', async () => {
  const owner = await register(uniqueUsername('job-owner'));
  const stranger = await register(uniqueUsername('job-stranger'));
  const leftContent = 'one\ntwo\n';
  const rightContent = 'one\nthree\n';
  const formData = new FormData();

  formData.append('fileType', 'text');
  formData.append('leftFile', new Blob([leftContent], { type: 'text/plain' }), 'job-left.txt');
  formData.append('rightFile', new Blob([rightContent], { type: 'text/plain' }), 'job-right.txt');

  const compareResponse = await fetch(`${baseUrl}/api/diff/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`
    },
    body: formData
  });
  const compareJson = await compareResponse.json();
  const jobId = compareJson.jobId;
  const listResponse = await request('GET', '/api/jobs', { token: owner.token });
  const listedJob = listResponse.json.data.find((job) => job.id === jobId);
  const getResponse = await request('GET', `/api/jobs/${jobId}`, { token: owner.token });
  const getAsStranger = await request('GET', `/api/jobs/${jobId}`, { token: stranger.token });
  const deleteResponse = await request('DELETE', `/api/jobs/${jobId}`, { token: owner.token });
  const deletedGetResponse = await request('GET', `/api/jobs/${jobId}`, { token: owner.token });

  assert.equal(compareResponse.status, 200);
  assert.equal(compareJson.success, true);
  assert.equal(typeof jobId, 'string');
  assert.equal(listResponse.status, 200);
  assert.equal(Boolean(listedJob), true);
  assert.equal(listedJob.inputMode, 'pair');
  assert.equal(listedJob.resultCount, compareJson.summary.total);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.data.compareResult.jobId, jobId);
  assert.equal(getResponse.json.data.compareResult.summary.modified, 1);
  assert.equal(getResponse.json.data.files.map((file) => file.role).join(','), 'left,right');
  assert.equal('storagePath' in getResponse.json.data, false);
  assert.equal(getAsStranger.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedGetResponse.status, 404);
});

test('lets a logged-in user manage diff annotations for own job', async () => {
  const owner = await register(uniqueUsername('annotation-owner'));
  const stranger = await register(uniqueUsername('annotation-stranger'));
  const formData = new FormData();

  formData.append('fileType', 'text');
  formData.append('leftFile', new Blob(['left\nold\n'], { type: 'text/plain' }), 'anno-left.txt');
  formData.append('rightFile', new Blob(['left\nnew\n'], { type: 'text/plain' }), 'anno-right.txt');

  const compareResponse = await fetch(`${baseUrl}/api/diff/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`
    },
    body: formData
  });
  const compareJson = await compareResponse.json();
  const jobId = compareJson.jobId;
  const diffId = compareJson.result.find((item) => item.type === 'modified').meta.diffId;
  const createResponse = await request('POST', `/api/jobs/${jobId}/annotations`, {
    token: owner.token,
    body: {
      diffId,
      note: '这个字段需要复查',
      tag: '待复查',
      resolved: false
    }
  });
  const annotationId = createResponse.json.data.id;
  const listResponse = await request('GET', `/api/jobs/${jobId}/annotations`, { token: owner.token });
  const listAsStranger = await request('GET', `/api/jobs/${jobId}/annotations`, {
    token: stranger.token
  });
  const updateResponse = await request('PUT', `/api/annotations/${annotationId}`, {
    token: owner.token,
    body: {
      note: '这个差异已确认',
      tag: '已确认',
      resolved: true
    }
  });
  const updateAsStranger = await request('PUT', `/api/annotations/${annotationId}`, {
    token: stranger.token,
    body: {
      note: 'bad',
      tag: '异常变化',
      resolved: true
    }
  });
  const deleteResponse = await request('DELETE', `/api/annotations/${annotationId}`, {
    token: owner.token
  });
  const deletedListResponse = await request('GET', `/api/jobs/${jobId}/annotations`, { token: owner.token });

  assert.equal(compareResponse.status, 200);
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.data.diffId, diffId);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.data.length, 1);
  assert.equal(listAsStranger.status, 404);
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.data.tag, '已确认');
  assert.equal(updateResponse.json.data.resolved, true);
  assert.equal(updateAsStranger.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedListResponse.json.data.length, 0);
});

test('records html and pdf exports with optional job association', async () => {
  const owner = await register(uniqueUsername('export-owner'));
  const stranger = await register(uniqueUsername('export-stranger'));
  const formData = new FormData();

  formData.append('fileType', 'text');
  formData.append('leftFile', new Blob(['same\nold\n'], { type: 'text/plain' }), 'export-left.txt');
  formData.append('rightFile', new Blob(['same\nnew\n'], { type: 'text/plain' }), 'export-right.txt');

  const compareResponse = await fetch(`${baseUrl}/api/diff/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`
    },
    body: formData
  });
  const compareJson = await compareResponse.json();
  const jobId = compareJson.jobId;
  const exportOptions = {
    exportAllDifferences: true,
    includeSummary: true,
    includeFileInfo: true
  };
  const htmlResponse = await fetch(`${baseUrl}/api/export/html`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      compareResult: compareJson,
      jobId,
      options: exportOptions
    })
  });
  const pdfResponse = await fetch(`${baseUrl}/api/export/pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      compareResult: compareJson,
      options: exportOptions
    })
  });

  await htmlResponse.text();
  await pdfResponse.arrayBuffer();

  const listResponse = await request('GET', '/api/export-records', { token: owner.token });
  const jobListResponse = await request('GET', `/api/jobs/${jobId}/export-records`, {
    token: owner.token
  });
  const jobListAsStranger = await request('GET', `/api/jobs/${jobId}/export-records`, {
    token: stranger.token
  });
  const htmlRecord = listResponse.json.data.find((record) => record.exportType === 'html');
  const pdfRecord = listResponse.json.data.find((record) => record.exportType === 'pdf');
  const deleteResponse = await request('DELETE', `/api/export-records/${htmlRecord.id}`, {
    token: owner.token
  });
  const deletedListResponse = await request('GET', '/api/export-records', { token: owner.token });

  assert.equal(compareResponse.status, 200);
  assert.equal(htmlResponse.status, 200);
  assert.equal(pdfResponse.status, 200);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.data.length, 2);
  assert.equal(Boolean(htmlRecord.fileName.endsWith('.html')), true);
  assert.equal(htmlRecord.jobId, jobId);
  assert.equal(htmlRecord.jobTitle.includes('export-left.txt'), true);
  assert.equal(Boolean(pdfRecord.fileName.endsWith('.pdf')), true);
  assert.equal(pdfRecord.jobId, null);
  assert.equal(jobListResponse.status, 200);
  assert.equal(jobListResponse.json.data.length, 1);
  assert.equal(jobListAsStranger.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedListResponse.json.data.some((record) => record.id === htmlRecord.id), false);
});

test('records version chain metadata after authenticated multi-version compare', async () => {
  const owner = await register(uniqueUsername('version-chain-owner'));
  const stranger = await register(uniqueUsername('version-chain-stranger'));
  const formData = new FormData();

  formData.append('fileType', 'text');
  formData.append('versionFiles', new Blob(['alpha\nbeta\n'], { type: 'text/plain' }), 'v1.txt');
  formData.append('versionFiles', new Blob(['alpha\ngamma\n'], { type: 'text/plain' }), 'v2.txt');
  formData.append('versionFiles', new Blob(['alpha\ngamma\ndelta\n'], { type: 'text/plain' }), 'v3.txt');

  const compareResponse = await fetch(`${baseUrl}/api/diff/compare-versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${owner.token}`
    },
    body: formData
  });
  const compareJson = await compareResponse.json();
  const chainId = compareJson.chainId;
  const listResponse = await request('GET', '/api/version-chains', { token: owner.token });
  const listedChain = listResponse.json.data.find((chain) => chain.id === chainId);
  const getResponse = await request('GET', `/api/version-chains/${chainId}`, { token: owner.token });
  const getAsStranger = await request('GET', `/api/version-chains/${chainId}`, {
    token: stranger.token
  });
  const deleteResponse = await request('DELETE', `/api/version-chains/${chainId}`, {
    token: owner.token
  });
  const deletedGetResponse = await request('GET', `/api/version-chains/${chainId}`, {
    token: owner.token
  });

  assert.equal(compareResponse.status, 200);
  assert.equal(compareJson.success, true);
  assert.equal(typeof compareJson.jobId, 'string');
  assert.equal(typeof chainId, 'string');
  assert.equal(listResponse.status, 200);
  assert.equal(Boolean(listedChain), true);
  assert.equal(listedChain.versionCount, 3);
  assert.equal(listedChain.totalDifferences, compareJson.trend.totalDifferences);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.data.files.length, 3);
  assert.equal(getResponse.json.data.files.map((file) => file.versionLabel).join(','), 'v1,v2,v3');
  assert.equal(getResponse.json.data.versionResult.chainId, chainId);
  assert.equal(getResponse.json.data.versionResult.intervals.length, 2);
  assert.equal(getAsStranger.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedGetResponse.status, 404);
});

test('returns dashboard statistics for the current user', async () => {
  const { token } = await register(uniqueUsername('dashboard-owner'));
  const pairFormData = new FormData();

  pairFormData.append('fileType', 'text');
  pairFormData.append('leftFile', new Blob(['a\nb\n'], { type: 'text/plain' }), 'dash-left.txt');
  pairFormData.append('rightFile', new Blob(['a\nc\nd\n'], { type: 'text/plain' }), 'dash-right.txt');

  const pairCompareResponse = await fetch(`${baseUrl}/api/diff/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: pairFormData
  });
  const pairCompareJson = await pairCompareResponse.json();
  const exportOptions = {
    exportAllDifferences: true,
    includeSummary: true,
    includeFileInfo: true
  };

  await fetch(`${baseUrl}/api/export/html`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      compareResult: pairCompareJson,
      jobId: pairCompareJson.jobId,
      options: exportOptions
    })
  });

  const versionFormData = new FormData();

  versionFormData.append('fileType', 'text');
  versionFormData.append('versionFiles', new Blob(['one\n'], { type: 'text/plain' }), 'dash-v1.txt');
  versionFormData.append('versionFiles', new Blob(['one\ntwo\n'], { type: 'text/plain' }), 'dash-v2.txt');

  const versionCompareResponse = await fetch(`${baseUrl}/api/diff/compare-versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: versionFormData
  });
  const dashboardResponse = await request('GET', '/api/dashboard', { token });
  const stats = dashboardResponse.json.data;

  assert.equal(pairCompareResponse.status, 200);
  assert.equal(versionCompareResponse.status, 200);
  assert.equal(dashboardResponse.status, 200);
  assert.equal(stats.totalTasks, 2);
  assert.equal(stats.fileTypeCounts.text, 2);
  assert.equal(stats.exportCount, 1);
  assert.equal(stats.versionChainCount, 1);
  assert.equal(stats.totalDifferences > 0, true);
  assert.equal(stats.differenceTypeTotals.added > 0, true);
  assert.equal(stats.recent7DaysTaskCount, 2);
  assert.equal(stats.recent7DaysTrend.length, 7);
  assert.equal(stats.recentJobs.length, 2);
  assert.equal(typeof stats.recentJobs[0].id, 'string');
});

function buildFilterPresetBody(overrides = {}) {
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
      jsonIgnoredFields: 'updatedAt, timestamp'
    },
    normalization: {
      enabled: true,
      ignoredJsonFields: 'updatedAt, timestamp'
    },
    ...overrides
  };
}

test('lets a logged-in user manage filter presets', async () => {
  const owner = await register(uniqueUsername('preset-owner'));
  const stranger = await register(uniqueUsername('preset-stranger'));
  const createResponse = await request('POST', '/api/filter-presets', {
    token: owner.token,
    body: buildFilterPresetBody({
      isDefault: true
    })
  });
  const presetId = createResponse.json.data.id;
  const listResponse = await request('GET', '/api/filter-presets?fileType=json', { token: owner.token });
  const getResponse = await request('GET', `/api/filter-presets/${presetId}`, { token: owner.token });
  const updateResponse = await request('PUT', `/api/filter-presets/${presetId}`, {
    token: owner.token,
    body: {
      name: '忽略 JSON 更新时间',
      description: '更新后的描述',
      filters: {
        ignoreWhitespace: false,
        ignoreCase: true,
        ignoreComments: false
      }
    }
  });
  const defaultResponse = await request('POST', `/api/filter-presets/${presetId}/default`, {
    token: owner.token
  });
  const getAsStranger = await request('GET', `/api/filter-presets/${presetId}`, {
    token: stranger.token
  });
  const deleteResponse = await request('DELETE', `/api/filter-presets/${presetId}`, {
    token: owner.token
  });
  const deletedGetResponse = await request('GET', `/api/filter-presets/${presetId}`, {
    token: owner.token
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.json.data.isDefault, true);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.json.data.some((preset) => preset.id === presetId), true);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.json.data.filters.ignoreWhitespace, true);
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.data.name, '忽略 JSON 更新时间');
  assert.equal(updateResponse.json.data.filters.ignoreWhitespace, false);
  assert.equal(defaultResponse.status, 200);
  assert.equal(defaultResponse.json.data.isDefault, true);
  assert.equal(getAsStranger.status, 404);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deletedGetResponse.status, 404);
});

test('creates, updates and resets user settings', async () => {
  const { token } = await register(uniqueUsername('settings-owner'));
  const initialResponse = await request('GET', '/api/settings', { token });
  const updateResponse = await request('PUT', '/api/settings', {
    token,
    body: {
      defaultFileType: 'json',
      defaultFilters: {
        ignoreWhitespace: true,
        ignoreCase: true,
        ignoreComments: false
      },
      defaultAdvancedRules: {
        enabled: true,
        textIgnoredLineKeywords: 'debug',
        jsonIgnoredFields: 'updatedAt, timestamp',
        tableIgnoredColumns: 'remark'
      },
      defaultNormalization: {
        enabled: true,
        ignoreJsonFieldOrder: true,
        numericToleranceEnabled: true,
        numericTolerance: '0.01',
        normalizeDateFormat: true,
        tablePrimaryKeyColumns: 'id'
      },
      theme: 'dark'
    }
  });
  const resetResponse = await request('POST', '/api/settings/reset', { token });

  assert.equal(initialResponse.status, 200);
  assert.equal(initialResponse.json.data.defaultFileType, 'auto');
  assert.equal(initialResponse.json.data.theme, 'light');
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.json.data.defaultFileType, 'json');
  assert.equal(updateResponse.json.data.defaultFilters.ignoreWhitespace, true);
  assert.equal(updateResponse.json.data.defaultAdvancedRules.jsonIgnoredFields, 'updatedAt, timestamp');
  assert.equal(updateResponse.json.data.defaultNormalization.tablePrimaryKeyColumns, 'id');
  assert.equal(updateResponse.json.data.theme, 'dark');
  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.json.data.defaultFileType, 'auto');
  assert.equal(resetResponse.json.data.theme, 'light');
});
