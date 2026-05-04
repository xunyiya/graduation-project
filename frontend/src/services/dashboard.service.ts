import { apiFetch } from './api';
import type { ApiResponse, DashboardStats } from '../types/api';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await apiFetch<ApiResponse<DashboardStats>>('/api/dashboard');

  return response.data;
}
