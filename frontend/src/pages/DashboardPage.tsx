import { useEffect, useMemo, useState } from 'react';

import { fetchDashboardStats } from '../services/dashboard.service';
import type { DashboardRecentJob, DashboardStats, FileType } from '../types/api';

const fileTypeLabels: Record<FileType, string> = {
  text: 'Text',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

const inputModeLabels: Record<string, string> = {
  pair: '双文件',
  versions: '多版本'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  });
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getMaxValue(values: number[]) {
  return Math.max(...values, 1);
}

function StatCard({
  label,
  value,
  note
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="dashboard-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function DistributionBar({
  label,
  value,
  maxValue,
  tone
}: {
  label: string;
  value: number;
  maxValue: number;
  tone: string;
}) {
  const width = `${Math.max(4, Math.round((value / maxValue) * 100))}%`;

  return (
    <div className="dashboard-distribution-row">
      <span>{label}</span>
      <div className="dashboard-bar-track">
        <div className={`dashboard-bar-fill ${tone}`} style={{ width }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function RecentJobList({ jobs }: { jobs: DashboardRecentJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="export-record-empty">
        暂无最近任务，完成一次文件对比后这里会显示任务摘要。
      </div>
    );
  }

  return (
    <div className="dashboard-recent-list">
      {jobs.map((job) => (
        <article className="dashboard-recent-job" key={job.id}>
          <div>
            <strong>{job.title}</strong>
            <span>
              {fileTypeLabels[job.fileType]} / {inputModeLabels[job.inputMode] ?? job.inputMode}
            </span>
          </div>
          <div className="dashboard-recent-meta">
            <span>{job.resultCount} 个差异</span>
            <time dateTime={job.createdAt}>{formatDate(job.createdAt)}</time>
          </div>
        </article>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '数据看板加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const maxFileTypeCount = useMemo(
    () => getMaxValue(stats ? Object.values(stats.fileTypeCounts) : [0]),
    [stats]
  );
  const maxDifferenceTypeCount = useMemo(
    () =>
      getMaxValue(
        stats
          ? [
              stats.differenceTypeTotals.added,
              stats.differenceTypeTotals.removed,
              stats.differenceTypeTotals.modified
            ]
          : [0]
      ),
    [stats]
  );
  const maxTrendValue = useMemo(
    () =>
      getMaxValue(
        stats
          ? stats.recent7DaysTrend.map((point) =>
              Math.max(point.taskCount, point.differenceCount)
            )
          : [0]
      ),
    [stats]
  );

  if (loading) {
    return (
      <section className="page-stack">
        <div className="empty-state">
          <strong>正在加载数据看板</strong>
          <span>系统正在统计当前账号的对比任务、导出记录和版本链。</span>
        </div>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="page-stack">
        <section className="error-message">{error || '数据看板加载失败'}</section>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">Analytics Dashboard</p>
          <h1>数据看板</h1>
          <p className="page-subtitle">
            汇总当前账号的对比任务、差异分布、导出审计和多版本分析趋势。
          </p>
        </div>
        <div className="history-count-card">
          <span className="meta-label">近 7 天任务</span>
          <strong>{stats.recent7DaysTaskCount}</strong>
          <small>compare_jobs trend</small>
        </div>
      </header>

      <section className="dashboard-stat-grid" aria-label="核心统计">
        <StatCard label="总任务数" note="compare_jobs" value={stats.totalTasks} />
        <StatCard label="总差异数" note="compare_results.summary" value={stats.totalDifferences} />
        <StatCard label="导出次数" note="export_records" value={stats.exportCount} />
        <StatCard label="多版本次数" note="version_chains" value={stats.versionChainCount} />
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="section-heading compact-section-heading">
            <span className="eyebrow">File Types</span>
            <h2>文件类型分布</h2>
          </div>
          {(['text', 'json', 'csv', 'excel'] as FileType[]).map((fileType) => (
            <DistributionBar
              key={fileType}
              label={fileTypeLabels[fileType]}
              maxValue={maxFileTypeCount}
              tone={fileType}
              value={stats.fileTypeCounts[fileType]}
            />
          ))}
        </article>

        <article className="dashboard-panel">
          <div className="section-heading compact-section-heading">
            <span className="eyebrow">Diff Types</span>
            <h2>差异类型分布</h2>
          </div>
          <DistributionBar
            label="新增"
            maxValue={maxDifferenceTypeCount}
            tone="added"
            value={stats.differenceTypeTotals.added}
          />
          <DistributionBar
            label="删除"
            maxValue={maxDifferenceTypeCount}
            tone="removed"
            value={stats.differenceTypeTotals.removed}
          />
          <DistributionBar
            label="修改"
            maxValue={maxDifferenceTypeCount}
            tone="modified"
            value={stats.differenceTypeTotals.modified}
          />
        </article>
      </section>

      <section className="dashboard-panel" aria-label="最近 7 天趋势">
        <div className="section-heading compact-section-heading">
          <span className="eyebrow">7-Day Trend</span>
          <h2>最近 7 天趋势</h2>
        </div>
        <div className="dashboard-trend-chart">
          {stats.recent7DaysTrend.map((point) => (
            <div className="dashboard-trend-day" key={point.date}>
              <div className="dashboard-trend-bars">
                <span
                  className="dashboard-trend-bar tasks"
                  style={{ height: `${Math.max(6, (point.taskCount / maxTrendValue) * 100)}%` }}
                  title={`${point.taskCount} 次对比`}
                />
                <span
                  className="dashboard-trend-bar diffs"
                  style={{
                    height: `${Math.max(6, (point.differenceCount / maxTrendValue) * 100)}%`
                  }}
                  title={`${point.differenceCount} 个差异`}
                />
              </div>
              <strong>{formatShortDate(point.date)}</strong>
              <small>
                {point.taskCount} / {point.differenceCount}
              </small>
            </div>
          ))}
        </div>
        <div className="dashboard-legend">
          <span className="tasks">对比次数</span>
          <span className="diffs">差异数</span>
        </div>
      </section>

      <section className="dashboard-panel" aria-label="最近任务列表">
        <div className="section-heading compact-section-heading">
          <span className="eyebrow">Recent Jobs</span>
          <h2>最近任务列表</h2>
        </div>
        <RecentJobList jobs={stats.recentJobs} />
      </section>
    </section>
  );
}
