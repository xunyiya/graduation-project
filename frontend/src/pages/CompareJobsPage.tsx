import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteCompareJob,
  getCompareJob,
  listCompareJobs
} from '../services/compareJob.service';
import type { CompareJobRecord } from '../types/api';

const fileTypeLabels = {
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

const inputModeLabels = {
  pair: '双文件',
  versions: '多版本'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  });
}

function formatDuration(value: number) {
  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(2)} s`;
}

export function CompareJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CompareJobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<CompareJobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listCompareJobs()
      .then(setJobs)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '对比任务加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleOpen(id: string) {
    setError('');
    setBusyId(id);

    try {
      setSelectedJob(await getCompareJob(id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '对比任务读取失败');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    setBusyId(id);

    try {
      await deleteCompareJob(id);
      setJobs((currentJobs) => currentJobs.filter((job) => job.id !== id));
      setSelectedJob((currentJob) => (currentJob?.id === id ? null : currentJob));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '对比任务删除失败');
    } finally {
      setBusyId(null);
    }
  }

  function handleRestore(job: CompareJobRecord) {
    if (!job.compareResult && !job.versionResult) {
      return;
    }

    navigate('/compare', {
      state: {
        compareResult: job.compareResult,
        versionResult: job.versionResult,
        restoreSource: 'job'
      }
    });
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">Job Center</p>
          <h1>对比任务中心</h1>
          <p className="page-subtitle">
            汇总每一次对比任务的元信息、参与文件和完整结果，方便按任务恢复分析现场。
          </p>
        </div>
        <div className="history-count-card">
          <span className="meta-label">当前任务</span>
          <strong>{loading ? '...' : jobs.length}</strong>
          <small>compare_jobs / compare_results</small>
        </div>
      </header>

      {error && <section className="error-message">{error}</section>}

      {loading ? (
        <div className="empty-state">
          <strong>正在加载对比任务</strong>
          <span>系统会读取当前登录用户保存到 SQLite 的任务记录。</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <strong>暂无对比任务</strong>
          <span>完成一次文件对比后，这里会自动生成对应任务。</span>
        </div>
      ) : (
        <section className="job-center-layout">
          <div className="job-list" aria-label="对比任务列表">
            {jobs.map((job) => (
              <article className="job-item" key={job.id}>
                <div className="job-main">
                  <strong>{job.title}</strong>
                  <span>{formatDate(job.createdAt)}</span>
                  <small>
                    {fileTypeLabels[job.fileType]} / {inputModeLabels[job.inputMode]} /{' '}
                    {job.algorithm ?? 'unknown'}
                  </small>
                </div>
                <div className="job-metrics">
                  <span>{job.resultCount} 个差异</span>
                  <span>{formatDuration(job.durationMs)}</span>
                  <span className={job.resultTruncated ? 'warning' : 'ok'}>
                    {job.resultTruncated ? '已截断' : '完整'}
                  </span>
                </div>
                <div className="job-actions">
                  <button disabled={busyId === job.id} onClick={() => void handleOpen(job.id)} type="button">
                    {busyId === job.id ? '处理中' : '查看详情'}
                  </button>
                  <button
                    className="danger-button"
                    disabled={busyId === job.id}
                    onClick={() => void handleDelete(job.id)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="job-detail-panel" aria-label="对比任务详情">
            {selectedJob ? (
              <>
                <div className="section-heading">
                  <span className="eyebrow">Details</span>
                  <h2>{selectedJob.title}</h2>
                </div>
                <div className="job-detail-grid">
                  <span>文件类型</span>
                  <strong>{fileTypeLabels[selectedJob.fileType]}</strong>
                  <span>输入模式</span>
                  <strong>{inputModeLabels[selectedJob.inputMode]}</strong>
                  <span>差异总数</span>
                  <strong>{selectedJob.resultCount}</strong>
                  <span>算法</span>
                  <strong>{selectedJob.algorithm ?? 'unknown'}</strong>
                  <span>是否截断</span>
                  <strong>{selectedJob.resultTruncated ? '是' : '否'}</strong>
                  <span>创建时间</span>
                  <strong>{formatDate(selectedJob.createdAt)}</strong>
                </div>
                {selectedJob.files && selectedJob.files.length > 0 && (
                  <div className="job-file-list">
                    {selectedJob.files.map((file) => (
                      <span key={file.id}>
                        {file.role}
                        {file.versionIndex !== null ? ` v${file.versionIndex + 1}` : ''}：{file.displayName}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className="primary-button inline-button"
                  disabled={!selectedJob.compareResult && !selectedJob.versionResult}
                  onClick={() => handleRestore(selectedJob)}
                  type="button"
                >
                  恢复结果
                </button>
              </>
            ) : (
              <div className="job-detail-empty">
                <strong>选择一个任务</strong>
                <span>点击列表中的查看详情后，可读取任务文件和完整结果。</span>
              </div>
            )}
          </aside>
        </section>
      )}
    </section>
  );
}
