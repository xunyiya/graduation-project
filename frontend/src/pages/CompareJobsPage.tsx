import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteCompareJob,
  getCompareJob,
  listCompareJobs
} from '../services/compareJob.service';
import {
  deleteExportRecord,
  listExportRecords,
  listExportRecordsByJob
} from '../services/exportRecord.service';
import {
  deleteVersionChain,
  getVersionChain,
  listVersionChains
} from '../services/versionChainRecord.service';
import { flattenChangedDiffItems } from '../components/compare/diffNavigation';
import type { CompareJobRecord, ExportRecord, VersionChainRecord } from '../types/api';

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

const trendLabels = {
  stable: '整体平稳',
  increasing: '差异递增',
  decreasing: '差异递减',
  mixed: '波动变化'
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

function formatExportType(value: string) {
  return value.toUpperCase();
}

function getExportJobLabel(record: ExportRecord) {
  return record.jobTitle ?? (record.jobId ? `任务 #${record.jobId}` : '未关联任务');
}

function getChainPeakLabel(chain: VersionChainRecord) {
  return chain.peakIntervalLabel ?? chain.trend.peakIntervalLabel ?? '暂无峰值';
}

function getActiveChainInterval(chain: VersionChainRecord | null, intervalId: string | null) {
  if (!chain?.versionResult) {
    return null;
  }

  return (
    chain.versionResult.intervals.find((interval) => interval.id === intervalId) ??
    chain.versionResult.intervals[0] ??
    null
  );
}

export function CompareJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CompareJobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<CompareJobRecord | null>(null);
  const [exportRecords, setExportRecords] = useState<ExportRecord[]>([]);
  const [selectedJobExports, setSelectedJobExports] = useState<ExportRecord[]>([]);
  const [versionChains, setVersionChains] = useState<VersionChainRecord[]>([]);
  const [selectedChain, setSelectedChain] = useState<VersionChainRecord | null>(null);
  const [selectedChainIntervalId, setSelectedChainIntervalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportBusyId, setExportBusyId] = useState<string | null>(null);
  const [chainBusyId, setChainBusyId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCompareJobs(), listExportRecords(), listVersionChains()])
      .then(([nextJobs, nextExportRecords, nextVersionChains]) => {
        setJobs(nextJobs);
        setExportRecords(nextExportRecords);
        setVersionChains(nextVersionChains);
      })
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
      const [job, records] = await Promise.all([getCompareJob(id), listExportRecordsByJob(id)]);

      setSelectedJob(job);
      setSelectedJobExports(records);
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
      setSelectedJobExports((currentRecords) =>
        selectedJob?.id === id ? [] : currentRecords.filter((record) => record.jobId !== id)
      );
      setExportRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.jobId === id
            ? {
                ...record,
                jobId: null,
                jobTitle: null
              }
            : record
        )
      );
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

  async function handleOpenChain(id: string) {
    setError('');
    setChainBusyId(id);

    try {
      const chain = await getVersionChain(id);

      setSelectedChain(chain);
      setSelectedChainIntervalId(chain.versionResult?.intervals[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '多版本记录读取失败');
    } finally {
      setChainBusyId(null);
    }
  }

  async function handleDeleteChain(id: string) {
    setError('');
    setChainBusyId(id);

    try {
      await deleteVersionChain(id);
      setVersionChains((currentChains) => currentChains.filter((chain) => chain.id !== id));
      setSelectedChain((currentChain) => (currentChain?.id === id ? null : currentChain));
      setSelectedChainIntervalId((currentId) => (selectedChain?.id === id ? null : currentId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '多版本记录删除失败');
    } finally {
      setChainBusyId(null);
    }
  }

  function handleRestoreChain(chain: VersionChainRecord) {
    if (!chain.versionResult) {
      return;
    }

    navigate('/compare', {
      state: {
        versionResult: chain.versionResult,
        restoreSource: 'job'
      }
    });
  }

  async function handleDeleteExport(id: string) {
    setError('');
    setExportBusyId(id);

    try {
      await deleteExportRecord(id);
      setExportRecords((currentRecords) => currentRecords.filter((record) => record.id !== id));
      setSelectedJobExports((currentRecords) => currentRecords.filter((record) => record.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '导出记录删除失败');
    } finally {
      setExportBusyId(null);
    }
  }

  function renderExportRecords(records: ExportRecord[], emptyText: string) {
    if (records.length === 0) {
      return <div className="export-record-empty">{emptyText}</div>;
    }

    return (
      <div className="export-record-list">
        {records.map((record) => (
          <article className="export-record-row" key={record.id}>
            <strong>{formatExportType(record.exportType)}</strong>
            <span title={record.fileName}>{record.fileName}</span>
            <small>{getExportJobLabel(record)}</small>
            <time dateTime={record.createdAt}>{formatDate(record.createdAt)}</time>
            <button
              className="danger-button"
              disabled={exportBusyId === record.id}
              onClick={() => void handleDeleteExport(record.id)}
              type="button"
            >
              {exportBusyId === record.id ? '删除中' : '删除'}
            </button>
          </article>
        ))}
      </div>
    );
  }

  function renderVersionChainDetail() {
    if (!selectedChain) {
      return (
        <div className="job-detail-empty">
          <strong>选择一个多版本记录</strong>
          <span>查看版本链、趋势摘要和每个连续区间的差异结果。</span>
        </div>
      );
    }

    const activeInterval = getActiveChainInterval(selectedChain, selectedChainIntervalId);
    const activeDiffs = activeInterval ? flattenChangedDiffItems(activeInterval.result).slice(0, 5) : [];

    return (
      <>
        <div className="section-heading compact-section-heading">
          <span className="eyebrow">Version Chain</span>
          <h3>{selectedChain.title}</h3>
        </div>
        <div className="job-detail-grid">
          <span>文件类型</span>
          <strong>{fileTypeLabels[selectedChain.fileType]}</strong>
          <span>版本数量</span>
          <strong>{selectedChain.versionCount}</strong>
          <span>累计差异</span>
          <strong>{selectedChain.totalDifferences}</strong>
          <span>峰值区间</span>
          <strong>{getChainPeakLabel(selectedChain)}</strong>
          <span>趋势</span>
          <strong>{trendLabels[selectedChain.trend.direction]}</strong>
          <span>创建时间</span>
          <strong>{formatDate(selectedChain.createdAt)}</strong>
        </div>

        <div className="version-chain-flow" aria-label="版本链">
          {selectedChain.files.map((file, index) => (
            <div className="version-chain-node" key={file.id}>
              <span>v{index + 1}</span>
              <strong>{file.versionLabel}</strong>
              <small title={file.fileName}>{file.fileName}</small>
            </div>
          ))}
        </div>

        <div className="version-chain-intervals" aria-label="区间摘要">
          {selectedChain.versionResult?.intervals.map((interval) => (
            <button
              className={interval.id === activeInterval?.id ? 'active' : ''}
              key={interval.id}
              onClick={() => setSelectedChainIntervalId(interval.id)}
              type="button"
            >
              <span>{interval.label}</span>
              <strong>{interval.summary.total}</strong>
              <small>
                +{interval.summary.added} / -{interval.summary.removed} / ~{interval.summary.modified}
              </small>
            </button>
          )) ?? (
            <div className="export-record-empty">
              该版本链仅保存了摘要，关联任务结果已不存在，无法展示区间差异明细。
            </div>
          )}
        </div>

        {activeInterval && (
          <div className="version-chain-diff-preview" aria-label="区间差异结果">
            <strong>{activeInterval.label} 区间差异结果</strong>
            {activeDiffs.length === 0 ? (
              <span>该区间暂无差异。</span>
            ) : (
              activeDiffs.map((entry) => (
                <code key={entry.diffId}>
                  {entry.label} · {entry.path || entry.diffId}
                </code>
              ))
            )}
          </div>
        )}

        <button
          className="primary-button inline-button"
          disabled={!selectedChain.versionResult}
          onClick={() => handleRestoreChain(selectedChain)}
          type="button"
        >
          恢复完整多版本结果
        </button>
      </>
    );
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
                <section className="job-export-section" aria-label="该任务导出记录">
                  <div className="section-heading compact-section-heading">
                    <span className="eyebrow">Exports</span>
                    <h3>该任务导出记录</h3>
                  </div>
                  {renderExportRecords(selectedJobExports, '该任务暂无导出记录。')}
                </section>
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

      <section className="version-chain-record-panel" aria-label="多版本记录">
        <div className="section-heading compact-section-heading">
          <span className="eyebrow">Version Records</span>
          <h2>多版本记录</h2>
        </div>
        {versionChains.length === 0 ? (
          <div className="export-record-empty">
            暂无多版本连续对比记录，上传多个版本文件后会自动保存版本链。
          </div>
        ) : (
          <div className="version-chain-layout">
            <div className="version-chain-list">
              {versionChains.map((chain) => (
                <article className="version-chain-item" key={chain.id}>
                  <div className="job-main">
                    <strong>{chain.title}</strong>
                    <span>{formatDate(chain.createdAt)}</span>
                    <small>
                      {fileTypeLabels[chain.fileType]} / {chain.versionCount} 个版本 / 峰值：
                      {getChainPeakLabel(chain)}
                    </small>
                  </div>
                  <div className="job-metrics">
                    <span>{chain.totalDifferences} 个差异</span>
                    <span>{trendLabels[chain.trend.direction]}</span>
                  </div>
                  <div className="job-actions">
                    <button
                      disabled={chainBusyId === chain.id}
                      onClick={() => void handleOpenChain(chain.id)}
                      type="button"
                    >
                      {chainBusyId === chain.id ? '处理中' : '查看详情'}
                    </button>
                    <button
                      className="danger-button"
                      disabled={chainBusyId === chain.id}
                      onClick={() => void handleDeleteChain(chain.id)}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <aside className="version-chain-detail-panel">{renderVersionChainDetail()}</aside>
          </div>
        )}
      </section>

      <section className="export-record-panel" aria-label="最近导出记录">
        <div className="section-heading compact-section-heading">
          <span className="eyebrow">Audit Trail</span>
          <h2>最近导出记录</h2>
        </div>
        {renderExportRecords(exportRecords.slice(0, 8), '暂无导出记录，完成 HTML 或 PDF 导出后会显示在这里。')}
      </section>
    </section>
  );
}
