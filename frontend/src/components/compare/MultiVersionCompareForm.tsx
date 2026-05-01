import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import type { DiffFilterOptions, RequestFileType } from '../../types/api';

interface MultiVersionCompareFormProps {
  filters: DiffFilterOptions;
  requestFileType: RequestFileType;
  submitting: boolean;
  onSubmit: (formData: FormData) => void;
}

const acceptedFileTypes =
  '.txt,.json,.csv,.xlsx,text/plain,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function sortVersionFiles(files: File[]) {
  return [...files].sort((leftFile, rightFile) =>
    leftFile.name.localeCompare(rightFile.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function MultiVersionCompareForm({
  filters,
  requestFileType,
  submitting,
  onSubmit
}: MultiVersionCompareFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const canSubmit = files.length >= 2 && !submitting;
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(sortVersionFiles(Array.from(event.currentTarget.files ?? [])));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('fileType', requestFileType);
    formData.append('ignoreWhitespace', String(filters.ignoreWhitespace));
    formData.append('ignoreCase', String(filters.ignoreCase));
    formData.append('ignoreComments', String(filters.ignoreComments));
    files.forEach((file) => formData.append('versionFiles', file));

    onSubmit(formData);
  }

  return (
    <form className="multi-version-panel" onSubmit={handleSubmit}>
      <div className="panel-title">
        <div>
          <h2>多版本连续对比</h2>
          <p>上传 A/B/C/... 版本文件后，系统会按文件名自然顺序生成 v1→v2、v2→v3 的版本链。</p>
        </div>
        <span>{requestFileType === 'auto' ? '自动识别' : requestFileType.toUpperCase()}</span>
      </div>

      <label className="multi-version-dropzone">
        <span>版本文件序列</span>
        <input accept={acceptedFileTypes} multiple name="versionFiles" onChange={handleFileChange} type="file" />
        <strong>{files.length >= 2 ? `${files.length} 个版本已就绪` : '选择至少 2 个版本文件'}</strong>
        <small>建议命名为 v1、v2、v3 或带日期的连续版本。</small>
      </label>

      {files.length > 0 && (
        <div className="version-file-sequence" aria-label="版本文件顺序">
          {files.map((file, index) => (
            <div className="version-file-item" key={`${file.name}-${file.lastModified}`}>
              <span>v{index + 1}</span>
              <strong>{file.name}</strong>
              <small>{formatFileSize(file.size)}</small>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button className="secondary-button" disabled={!canSubmit} type="submit">
          {submitting ? '分析中' : '开始多版本对比'}
        </button>
        <span>{files.length > 0 ? `总大小 ${formatFileSize(totalSize)}` : '文本过滤选项会沿用当前页面配置。'}</span>
      </div>
    </form>
  );
}
