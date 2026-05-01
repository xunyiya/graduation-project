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
