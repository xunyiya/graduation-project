import PDFDocument from 'pdfkit';

import type { CompareResponse, DiffResultItem, DiffSummary, ExportOptions } from '../types/api.js';

interface BuildExportInput {
  compareResult: CompareResponse;
  options: ExportOptions;
  selectedDiffId?: string | null;
}

const diffTypeLabels = {
  added: '新增',
  removed: '删除',
  modified: '修改',
  unchanged: '无变化'
};

const fileTypeLabels = {
  text: '文本',
  json: 'JSON',
  csv: 'CSV',
  excel: 'Excel'
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function flattenResultItems(items: DiffResultItem[]): DiffResultItem[] {
  const flattenedItems: DiffResultItem[] = [];

  function walk(item: DiffResultItem) {
    flattenedItems.push(item);

    if (item.kind === 'json-node') {
      item.children.forEach(walk);
    }
  }

  items.forEach(walk);
  return flattenedItems;
}

function getChangedItems(compareResult: CompareResponse, options: ExportOptions, selectedDiffId?: string | null) {
  const changedItems = flattenResultItems(compareResult.result).filter((item) => item.type !== 'unchanged');

  if (options.exportAllDifferences) {
    return changedItems;
  }

  return changedItems.filter((item) => item.meta.diffId === selectedDiffId);
}

function renderSummary(summary: DiffSummary) {
  return `
    <section class="summary">
      <article><span>总数</span><strong>${summary.total}</strong></article>
      <article><span>新增</span><strong>${summary.added}</strong></article>
      <article><span>删除</span><strong>${summary.removed}</strong></article>
      <article><span>修改</span><strong>${summary.modified}</strong></article>
    </section>
  `;
}

function renderFileInfo(compareResult: CompareResponse) {
  const received = compareResult.received ?? {};
  const advancedRules = compareResult.advancedRules;
  const normalization = compareResult.normalization;

  return `
    <section class="file-info">
      <h2>文件信息</h2>
      <dl>
        <dt>文件类型</dt><dd>${fileTypeLabels[compareResult.fileType]}</dd>
        <dt>左侧文件</dt><dd>${escapeHtml(received.leftFile ?? '文本输入')}</dd>
        <dt>右侧文件</dt><dd>${escapeHtml(received.rightFile ?? '文本输入')}</dd>
        <dt>过滤规则</dt><dd>${escapeHtml(compareResult.filters.active.map((filter) => filter.label).join('、') || '未启用')}</dd>
        <dt>高级规则</dt><dd>${escapeHtml(advancedRules?.active.map((rule) => rule.label).join('、') || '未启用')}</dd>
        <dt>归一化规则</dt><dd>${escapeHtml(normalization?.active.map((rule) => rule.label).join('、') || '未启用')}</dd>
      </dl>
    </section>
  `;
}

function renderAdvancedRulesInfo(compareResult: CompareResponse) {
  const advancedRules = compareResult.advancedRules;

  if (!advancedRules?.enabled) {
    return '';
  }

  return `
    <section class="advanced-rules">
      <h2>高级过滤规则</h2>
      <p class="muted">已忽略 ${advancedRules.ignoredDifferences.length} 项自定义规则差异。</p>
      ${
        advancedRules.ignoredDifferences.length === 0
          ? ''
          : `<table class="diff-table">
              <thead>
                <tr>
                  <th>规则</th>
                  <th>位置</th>
                  <th>原值</th>
                  <th>新值</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                ${advancedRules.ignoredDifferences
                  .slice(0, 50)
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.label)}</td>
                        <td><code>${escapeHtml(item.path)}</code></td>
                        <td><code>${escapeHtml(item.leftValue ?? '-')}</code></td>
                        <td><code>${escapeHtml(item.rightValue ?? '-')}</code></td>
                        <td>${escapeHtml(item.reason)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>`
      }
    </section>
  `;
}

function renderNormalizationInfo(compareResult: CompareResponse) {
  const normalization = compareResult.normalization;

  if (!normalization?.enabled) {
    return '';
  }

  return `
    <section class="normalization">
      <h2>归一化处理</h2>
      <p class="muted">已忽略 ${normalization.ignoredDifferences.length} 项归一化差异。</p>
      ${
        normalization.ignoredDifferences.length === 0
          ? ''
          : `<table class="diff-table">
              <thead>
                <tr>
                  <th>规则</th>
                  <th>位置</th>
                  <th>原值</th>
                  <th>新值</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                ${normalization.ignoredDifferences
                  .slice(0, 50)
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.label)}</td>
                        <td><code>${escapeHtml(item.path)}</code></td>
                        <td><code>${escapeHtml(item.leftValue ?? '-')}</code></td>
                        <td><code>${escapeHtml(item.rightValue ?? '-')}</code></td>
                        <td>${escapeHtml(item.reason)}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>`
      }
    </section>
  `;
}

function renderDiffRows(items: DiffResultItem[]) {
  if (items.length === 0) {
    return '<p class="empty">未选择差异项或当前没有差异。</p>';
  }

  return `
    <table class="diff-table">
      <thead>
        <tr>
          <th>差异</th>
          <th>位置</th>
          <th>原值</th>
          <th>新值</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr class="${item.type}">
                <td>${diffTypeLabels[item.type]}</td>
                <td><code>${escapeHtml(item.meta.path)}</code></td>
                <td><code>${escapeHtml(item.meta.leftValue ?? '-')}</code></td>
                <td><code>${escapeHtml(item.meta.rightValue ?? '-')}</code></td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildExportHtml({ compareResult, options, selectedDiffId }: BuildExportInput) {
  const items = getChangedItems(compareResult, options, selectedDiffId);
  const createdAt = new Date().toLocaleString('zh-CN', { hour12: false });

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>数据差异对比报告</title>
    <style>
      body { margin: 32px; color: #172026; font-family: Arial, "PingFang SC", "Microsoft YaHei", sans-serif; }
      h1 { margin: 0 0 8px; font-size: 26px; }
      h2 { margin: 24px 0 12px; font-size: 18px; }
      .muted { color: #687683; margin-bottom: 24px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
      .summary article { border: 1px solid #dde3ea; border-radius: 8px; padding: 14px; }
      .summary span { display: block; color: #687683; font-size: 13px; }
      .summary strong { display: block; margin-top: 6px; font-size: 24px; }
      .file-info dl { display: grid; grid-template-columns: 120px 1fr; gap: 8px 12px; }
      .file-info dt { color: #687683; }
      .file-info dd { margin: 0; }
      .diff-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      .diff-table th, .diff-table td { border: 1px solid #dde3ea; padding: 9px 10px; text-align: left; vertical-align: top; }
      .diff-table th { background: #f0f3f6; }
      .diff-table tr.added td { background: #e6f7ec; }
      .diff-table tr.removed td { background: #ffe8e8; }
      .diff-table tr.modified td { background: #fff6cf; }
      code { white-space: pre-wrap; word-break: break-word; }
      .empty { color: #687683; }
    </style>
  </head>
  <body>
    <h1>数据差异对比报告</h1>
    <div class="muted">生成时间：${escapeHtml(createdAt)} · 类型：${fileTypeLabels[compareResult.fileType]}</div>
    ${options.includeSummary ? renderSummary(compareResult.summary) : ''}
    ${options.includeFileInfo ? renderFileInfo(compareResult) : ''}
    ${renderAdvancedRulesInfo(compareResult)}
    ${renderNormalizationInfo(compareResult)}
    <section>
      <h2>${options.exportAllDifferences ? '差异明细' : '当前差异'}</h2>
      ${renderDiffRows(items)}
    </section>
  </body>
</html>`;
}

function addPdfSummary(doc: PDFKit.PDFDocument, summary: DiffSummary) {
  doc
    .fontSize(11)
    .text(`总数: ${summary.total}    新增: ${summary.added}    删除: ${summary.removed}    修改: ${summary.modified}`)
    .moveDown();
}

function addPdfFileInfo(doc: PDFKit.PDFDocument, compareResult: CompareResponse) {
  const received = compareResult.received ?? {};
  const advancedRules = compareResult.advancedRules?.active.map((rule) => rule.label).join(', ') || 'None';
  const filters = compareResult.filters.active.map((filter) => filter.label).join(', ') || 'None';
  const normalization = compareResult.normalization?.active.map((rule) => rule.label).join(', ') || 'None';

  doc
    .fontSize(11)
    .text(`Type: ${compareResult.fileType}`)
    .text(`Left: ${String(received.leftFile ?? 'text input')}`)
    .text(`Right: ${String(received.rightFile ?? 'text input')}`)
    .text(`Filters: ${filters}`)
    .text(`Advanced rules: ${advancedRules}`)
    .text(`Normalization: ${normalization}`)
    .moveDown();
}

function getPdfColor(type: DiffResultItem['type']) {
  if (type === 'added') {
    return '#1d7a46';
  }

  if (type === 'removed') {
    return '#b42318';
  }

  if (type === 'modified') {
    return '#8a6d00';
  }

  return '#172026';
}

export function buildExportPdf(input: BuildExportInput): Promise<Buffer> {
  const { compareResult, options, selectedDiffId } = input;
  const items = getChangedItems(compareResult, options, selectedDiffId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Data Diff Report').moveDown(0.5);
    doc.fontSize(10).fillColor('#687683').text(`Generated at: ${new Date().toISOString()}`).moveDown();
    doc.fillColor('#172026');

    if (options.includeSummary) {
      addPdfSummary(doc, compareResult.summary);
    }

    if (options.includeFileInfo) {
      addPdfFileInfo(doc, compareResult);
    }

    if (compareResult.advancedRules?.enabled) {
      doc
        .fontSize(11)
        .text(`Advanced rules ignored: ${compareResult.advancedRules.ignoredDifferences.length}`)
        .moveDown(0.5);
    }

    if (compareResult.normalization?.enabled) {
      doc
        .fontSize(11)
        .text(`Normalization ignored: ${compareResult.normalization.ignoredDifferences.length}`)
        .moveDown(0.5);
    }

    doc.fontSize(14).text(options.exportAllDifferences ? 'Differences' : 'Selected Difference').moveDown(0.5);

    if (items.length === 0) {
      doc.fontSize(11).fillColor('#687683').text('No differences selected.');
    } else {
      items.forEach((item, index) => {
        doc
          .fillColor(getPdfColor(item.type))
          .fontSize(11)
          .text(`${index + 1}. [${item.type}] ${item.meta.path}`);
        doc
          .fillColor('#172026')
          .fontSize(9)
          .text(`Left: ${item.meta.leftValue ?? '-'}`)
          .text(`Right: ${item.meta.rightValue ?? '-'}`)
          .moveDown(0.5);
      });
    }

    doc.end();
  });
}
