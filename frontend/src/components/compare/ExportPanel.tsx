import type { ExportOptions } from '../../types/api';

interface ExportPanelProps {
  disabled: boolean;
  exportingFormat: 'html' | 'pdf' | null;
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
  onExport: (format: 'html' | 'pdf') => void;
}

export function ExportPanel({
  disabled,
  exportingFormat,
  options,
  onChange,
  onExport
}: ExportPanelProps) {
  function updateOption(key: keyof ExportOptions, value: boolean) {
    onChange({
      ...options,
      [key]: value
    });
  }

  return (
    <section className="export-panel">
      <div className="export-heading">
        <strong>结果导出</strong>
        <span>HTML / PDF</span>
      </div>
      <div className="export-options">
        <label className="check-row">
          <input
            checked={options.exportAllDifferences}
            onChange={(event) => updateOption('exportAllDifferences', event.currentTarget.checked)}
            type="checkbox"
          />
          导出全部差异
        </label>
        <label className="check-row">
          <input
            checked={options.includeSummary}
            onChange={(event) => updateOption('includeSummary', event.currentTarget.checked)}
            type="checkbox"
          />
          包含统计摘要
        </label>
        <label className="check-row">
          <input
            checked={options.includeFileInfo}
            onChange={(event) => updateOption('includeFileInfo', event.currentTarget.checked)}
            type="checkbox"
          />
          包含文件基本信息
        </label>
      </div>
      <div className="export-actions">
        <button
          className="secondary-button"
          disabled={disabled || exportingFormat !== null}
          onClick={() => onExport('html')}
          type="button"
        >
          {exportingFormat === 'html' ? '导出中' : '导出 HTML'}
        </button>
        <button
          className="secondary-button"
          disabled={disabled || exportingFormat !== null}
          onClick={() => onExport('pdf')}
          type="button"
        >
          {exportingFormat === 'pdf' ? '导出中' : '导出 PDF'}
        </button>
      </div>
    </section>
  );
}
