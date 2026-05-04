import type { DiffSummary, SupportedFileType } from '../types/api.js';
import { database } from './database.service.js';

type FileTypeCounts = Record<SupportedFileType, number>;

export interface DashboardTrendPoint {
  date: string;
  taskCount: number;
  differenceCount: number;
}

export interface DashboardRecentJob {
  id: string;
  title: string;
  fileType: SupportedFileType;
  inputMode: string;
  resultCount: number;
  resultTruncated: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  fileTypeCounts: FileTypeCounts;
  totalDifferences: number;
  differenceTypeTotals: {
    added: number;
    removed: number;
    modified: number;
  };
  exportCount: number;
  versionChainCount: number;
  recent7DaysTaskCount: number;
  recent7DaysTrend: DashboardTrendPoint[];
  recentJobs: DashboardRecentJob[];
}

interface CompareJobRow {
  id: number;
  title: string;
  file_type: SupportedFileType;
  input_mode: string;
  result_count: number | null;
  result_truncated: number;
  created_at: string;
}

interface CompareResultSummaryRow {
  job_id: number;
  created_at: string;
  summary: string;
}

interface CountRow {
  count: number;
}

function emptyFileTypeCounts(): FileTypeCounts {
  return {
    text: 0,
    json: 0,
    csv: 0,
    excel: 0
  };
}

function emptySummary(): DiffSummary {
  return {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };
}

function parseSummary(value: string): DiffSummary {
  try {
    const parsed = JSON.parse(value) as Partial<DiffSummary>;

    return {
      total: Number(parsed.total) || 0,
      added: Number(parsed.added) || 0,
      removed: Number(parsed.removed) || 0,
      modified: Number(parsed.modified) || 0
    };
  } catch {
    return emptySummary();
  }
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);

  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function buildRecent7DaysTrend() {
  const today = startOfDay(new Date());
  const start = addDays(today, -6);
  const trend = new Map<string, DashboardTrendPoint>();

  for (let index = 0; index < 7; index += 1) {
    const date = formatDateKey(addDays(start, index));

    trend.set(date, {
      date,
      taskCount: 0,
      differenceCount: 0
    });
  }

  return {
    start,
    trend
  };
}

function mapRecentJob(row: CompareJobRow): DashboardRecentJob {
  return {
    id: String(row.id),
    title: row.title,
    fileType: row.file_type,
    inputMode: row.input_mode,
    resultCount: row.result_count ?? 0,
    resultTruncated: row.result_truncated === 1,
    createdAt: row.created_at
  };
}

export function getDashboardStats(userId: number): DashboardStats {
  const jobs = database
    .prepare(
      `SELECT id, title, file_type, input_mode, result_count, result_truncated, created_at
       FROM compare_jobs
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as unknown as CompareJobRow[];
  const summaries = database
    .prepare(
      `SELECT results.job_id, jobs.created_at, results.summary
       FROM compare_results AS results
       INNER JOIN compare_jobs AS jobs ON jobs.id = results.job_id
       WHERE jobs.user_id = ?`
    )
    .all(userId) as unknown as CompareResultSummaryRow[];
  const exportCountRow = database
    .prepare('SELECT COUNT(*) AS count FROM export_records WHERE user_id = ?')
    .get(userId) as CountRow | undefined;
  const versionChainCountRow = database
    .prepare('SELECT COUNT(*) AS count FROM version_chains WHERE user_id = ?')
    .get(userId) as CountRow | undefined;
  const fileTypeCounts = emptyFileTypeCounts();
  const { start, trend } = buildRecent7DaysTrend();
  const summaryByJobId = new Map<number, DiffSummary>();

  summaries.forEach((row) => {
    summaryByJobId.set(row.job_id, parseSummary(row.summary));
  });

  jobs.forEach((job) => {
    fileTypeCounts[job.file_type] += 1;

    const date = new Date(job.created_at);

    if (date >= start) {
      const point = trend.get(formatDateKey(date));

      if (point) {
        point.taskCount += 1;
      }
    }
  });

  const differenceTypeTotals = {
    added: 0,
    removed: 0,
    modified: 0
  };
  let totalDifferences = 0;

  summaries.forEach((row) => {
    const summary = parseSummary(row.summary);
    const date = new Date(row.created_at);

    totalDifferences += summary.total;
    differenceTypeTotals.added += summary.added;
    differenceTypeTotals.removed += summary.removed;
    differenceTypeTotals.modified += summary.modified;

    if (date >= start) {
      const point = trend.get(formatDateKey(date));

      if (point) {
        point.differenceCount += summary.total;
      }
    }
  });

  jobs.forEach((job) => {
    if (summaryByJobId.has(job.id)) {
      return;
    }

    const fallbackCount = job.result_count ?? 0;
    const date = new Date(job.created_at);

    totalDifferences += fallbackCount;

    if (date >= start) {
      const point = trend.get(formatDateKey(date));

      if (point) {
        point.differenceCount += fallbackCount;
      }
    }
  });

  return {
    totalTasks: jobs.length,
    fileTypeCounts,
    totalDifferences,
    differenceTypeTotals,
    exportCount: exportCountRow?.count ?? 0,
    versionChainCount: versionChainCountRow?.count ?? 0,
    recent7DaysTaskCount: Array.from(trend.values()).reduce(
      (total, point) => total + point.taskCount,
      0
    ),
    recent7DaysTrend: Array.from(trend.values()),
    recentJobs: jobs.slice(0, 6).map(mapRecentJob)
  };
}
