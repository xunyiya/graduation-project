import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteHistoryRecord,
  getHistoryRecord,
  listHistoryRecords
} from '../services/history.service';
import type { HistoryRecord } from '../types/api';

const fileTypeLabels = {
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  });
}

function formatFilters(record: HistoryRecord) {
  return record.filters.active.map((filter) => filter.label).join('、') || '未启用';
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listHistoryRecords()
      .then(setRecords)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '历史记录加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    setError('');
    setBusyId(id);

    try {
      await deleteHistoryRecord(id);
      setRecords((currentRecords) => currentRecords.filter((record) => record.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '历史记录删除失败');
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpen(record: HistoryRecord) {
    setError('');
    setBusyId(record.id);

    try {
      const latestRecord = await getHistoryRecord(record.id);
      navigate('/compare', {
        state: {
          compareResult: latestRecord.compareResult
        }
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '历史记录读取失败');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">History Center</p>
          <h1>历史记录</h1>
          <p className="page-subtitle">
            按账号保存每一次对比结果，可快速恢复到对比工作台继续查看或导出。
          </p>
        </div>
        <div className="history-count-card">
          <span className="meta-label">当前记录</span>
          <strong>{loading ? '...' : records.length}</strong>
          <small>SQLite / 本地兜底存储</small>
        </div>
      </header>

      {error && <section className="error-message">{error}</section>}

      {loading ? (
        <div className="empty-state">
          <strong>正在加载历史记录</strong>
          <span>系统会读取当前登录用户保存到 SQLite 的记录。</span>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <strong>暂无历史记录</strong>
          <span>完成一次对比后，系统会把结果保存到当前账号下。</span>
        </div>
      ) : (
        <section className="history-list" aria-label="历史记录列表">
          {records.map((record) => (
            <article className="history-item" key={record.id}>
              <div className="history-main">
                <strong>
                  {fileTypeLabels[record.fileType]} · {record.summary.total} 个差异
                </strong>
                <span>{formatDate(record.createdAt)}</span>
                <code>
                  {record.fileNames.left} {'->'} {record.fileNames.right}
                </code>
                <small>过滤规则：{formatFilters(record)}</small>
              </div>
              <div className="history-stats">
                <span className="added">新增 {record.summary.added}</span>
                <span className="removed">删除 {record.summary.removed}</span>
                <span className="modified">修改 {record.summary.modified}</span>
              </div>
              <div className="history-actions">
                <button disabled={busyId === record.id} onClick={() => void handleOpen(record)} type="button">
                  {busyId === record.id ? '处理中' : '查看'}
                </button>
                <button
                  className="danger-button"
                  disabled={busyId === record.id}
                  onClick={() => void handleDelete(record.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
