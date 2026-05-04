import { useEffect, useState } from 'react';

import { deleteUploadedFile, listUploadedFiles } from '../services/fileRecord.service';
import type { UploadedFileRecord } from '../types/api';

const fileTypeLabels: Record<string, string> = {
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

const sourceTypeLabels: Record<string, string> = {
  upload: '上传',
  'compare-upload': '文件对比',
  'version-compare-upload': '多版本对比'
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    hour12: false
  });
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileTypeLabel(fileType: string) {
  return fileTypeLabels[fileType] ?? fileType.toUpperCase();
}

function getSourceTypeLabel(sourceType: string) {
  return sourceTypeLabels[sourceType] ?? sourceType;
}

export function FileRecordsPage() {
  const [files, setFiles] = useState<UploadedFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listUploadedFiles()
      .then(setFiles)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : '文件记录加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    setError('');
    setBusyId(id);

    try {
      await deleteUploadedFile(id);
      setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '文件记录删除失败');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">File Records</p>
          <h1>文件记录</h1>
          <p className="page-subtitle">
            查看当前账号在文件对比和多版本对比中留下的文件元数据，不暴露服务端存储路径。
          </p>
        </div>
        <div className="history-count-card">
          <span className="meta-label">已记录文件</span>
          <strong>{loading ? '...' : files.length}</strong>
          <small>文件名 / 类型 / 大小 / 哈希摘要</small>
        </div>
      </header>

      {error && <section className="error-message">{error}</section>}

      {loading ? (
        <div className="empty-state">
          <strong>正在加载文件记录</strong>
          <span>系统会读取当前登录用户保存到 SQLite 的文件元数据。</span>
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <strong>暂无文件记录</strong>
          <span>上传文件并完成一次对比后，这里会出现对应的文件元信息。</span>
        </div>
      ) : (
        <section className="file-record-panel" aria-label="文件记录列表">
          <div className="file-record-grid file-record-header">
            <span>文件名</span>
            <span>文件类型</span>
            <span>文件大小</span>
            <span>SHA-256</span>
            <span>来源</span>
            <span>上传时间</span>
            <span>操作</span>
          </div>
          {files.map((file) => (
            <article className="file-record-grid file-record-row" key={file.id}>
              <strong data-label="文件名" title={file.fileName}>
                {file.fileName}
              </strong>
              <span data-label="文件类型">{getFileTypeLabel(file.fileType)}</span>
              <span data-label="文件大小">{formatFileSize(file.sizeBytes)}</span>
              <code data-label="SHA-256">{file.sha256Prefix ?? '未记录'}</code>
              <span data-label="来源">{getSourceTypeLabel(file.sourceType)}</span>
              <time data-label="上传时间" dateTime={file.createdAt}>
                {formatDate(file.createdAt)}
              </time>
              <button
                className="danger-button"
                disabled={busyId === file.id}
                onClick={() => void handleDelete(file.id)}
                type="button"
              >
                {busyId === file.id ? '处理中' : '删除'}
              </button>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
