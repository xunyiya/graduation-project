import { apiFetch } from './api';
import type { ApiResponse, AuthPayload, User } from '../types/api';

function buildJsonRequest(body?: unknown): RequestInit {
  return {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  };
}

export async function registerUser(username: string, password: string) {
  const response = await apiFetch<ApiResponse<AuthPayload>>(
    '/api/auth/register',
    buildJsonRequest({ username, password })
  );

  return response.data;
}

export async function loginUser(username: string, password: string) {
  const response = await apiFetch<ApiResponse<AuthPayload>>(
    '/api/auth/login',
    buildJsonRequest({ username, password })
  );

  return response.data;
}

export async function logoutUser() {
  await apiFetch<{ success: boolean; message?: string }>('/api/auth/logout', {
    method: 'POST'
  });
}

export async function fetchCurrentUser() {
  const response = await apiFetch<ApiResponse<{ user: User }>>('/api/auth/me');

  return response.data.user;
}
