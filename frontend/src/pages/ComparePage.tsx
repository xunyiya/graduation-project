import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ActiveFiltersPanel } from '../components/compare/ActiveFiltersPanel';
import { AdvancedRulesSummaryPanel } from '../components/compare/AdvancedRulesSummaryPanel';
import {
  CompareInputForm,
  defaultAdvancedRuleFormState,
  defaultNormalizationFormState,
  loadAdvancedRuleFormState,
  loadNormalizationFormState,
  type AdvancedRuleFormState,
  type NormalizationFormState
} from '../components/compare/CompareInputForm';
import { DiffAnnotationPanel } from '../components/compare/DiffAnnotationPanel';
import { DiffListPanel } from '../components/compare/DiffListPanel';
import { DiffResultViewer } from '../components/compare/DiffResultViewer';
import { DiffSummaryPanel } from '../components/compare/DiffSummaryPanel';
import { ErrorMessage } from '../components/compare/ErrorMessage';
import { ExportPanel } from '../components/compare/ExportPanel';
import { FilterPresetManager } from '../components/compare/FilterPresetManager';
import { FilterPresetPanel } from '../components/compare/FilterPresetPanel';
import { JsonTreeDiffViewer } from '../components/compare/JsonTreeDiffViewer';
import { MultiVersionCompareForm } from '../components/compare/MultiVersionCompareForm';
import { NormalizationSummaryPanel } from '../components/compare/NormalizationSummaryPanel';
import { PerformanceNotice } from '../components/compare/PerformanceNotice';
import { TableDiffViewer } from '../components/compare/TableDiffViewer';
import { VersionTimelinePanel } from '../components/compare/VersionTimelinePanel';
import { findDensestRegion } from '../components/compare/diffDensity';
import { flattenChangedDiffItems, type DiffListEntry } from '../components/compare/diffNavigation';
import { compareFiles, compareVersionFiles } from '../services/api';
import {
  createDiffAnnotation,
  listDiffAnnotations,
  updateDiffAnnotation
} from '../services/diffAnnotation.service';
import { exportCompareResult } from '../services/export.service';
import {
  createFilterPreset,
  deleteFilterPreset,
  listFilterPresets,
  setDefaultFilterPreset,
  updateFilterPreset
} from '../services/filterPreset.service';
import { addHistoryRecord } from '../services/history.service';
import {
  applyThemePreference,
  normalizeAdvancedRulesForForm,
  normalizeFiltersForForm,
  normalizeNormalizationForForm
} from '../services/ruleState.service';
import { fetchUserSettings } from '../services/userSettings.service';
import type {
  CompareResponse,
  DiffAnnotation,
  DiffFilterKey,
  DiffFilterOptions,
  DiffLineItem,
  DiffResultItem,
  ExportOptions,
  FilterPreset,
  JsonDiffNode,
  RequestFileType,
  TableDiffItem,
  VersionChainResponse,
  VersionIntervalCompare
} from '../types/api';

const defaultFilterOptions: DiffFilterOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreComments: false
};

const defaultExportOptions: ExportOptions = {
  exportAllDifferences: true,
  includeSummary: true,
  includeFileInfo: true
};

const defaultPerformance = {
  algorithm: 'unknown',
  resultLimit: 0,
  resultCount: 0,
  resultTruncated: false,
  warnings: []
};

interface CompareLocationState {
  compareResult?: CompareResponse;
  versionResult?: VersionChainResponse;
  restoreSource?: 'history' | 'job';
}

function isTextLine(item: DiffResultItem): item is DiffLineItem {
  return item.kind === 'text-line';
}

function isJsonNode(item: DiffResultItem): item is JsonDiffNode {
  return item.kind === 'json-node';
}

function isTableDiffItem(item: DiffResultItem): item is TableDiffItem {
  return item.kind === 'table-diff';
}

function getFirstDiffId(interval: VersionIntervalCompare | null) {
  return interval ? (flattenChangedDiffItems(interval.result)[0]?.diffId ?? null) : null;
}

function renderDiffViewer({
  activeDiffId,
  fileType,
  onJump,
  result
}: {
  activeDiffId: string | null;
  fileType: CompareResponse['fileType'];
  onJump: (diffId: string) => void;
  result: DiffResultItem[];
}) {
  if (fileType === 'json') {
    return (
      <JsonTreeDiffViewer
        activeDiffId={activeDiffId}
        onJump={onJump}
        result={result.filter(isJsonNode)}
      />
    );
  }

  if (fileType === 'csv' || fileType === 'excel') {
    return (
      <TableDiffViewer
        activeDiffId={activeDiffId}
        onJump={onJump}
        result={result.filter(isTableDiffItem)}
      />
    );
  }

  return (
    <DiffResultViewer
      activeDiffId={activeDiffId}
      onJump={onJump}
      result={result.filter(isTextLine)}
    />
  );
}

export function ComparePage() {
  const location = useLocation();
  const locationState = location.state as CompareLocationState | null;
  const presetAppliedRef = useRef(false);
  const [response, setResponse] = useState<CompareResponse | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [versionResponse, setVersionResponse] = useState<VersionChainResponse | null>(null);
  const [versionError, setVersionError] = useState('');
  const [versionNotice, setVersionNotice] = useState('');
  const [versionSubmitting, setVersionSubmitting] = useState(false);
  const [activeVersionIntervalId, setActiveVersionIntervalId] = useState<string | null>(null);
  const [activeVersionDiffId, setActiveVersionDiffId] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'html' | 'pdf' | null>(null);
  const [filterOptions, setFilterOptions] = useState<DiffFilterOptions>(defaultFilterOptions);
  const [advancedRules, setAdvancedRules] = useState<AdvancedRuleFormState>(defaultAdvancedRuleFormState);
  const [normalization, setNormalization] =
    useState<NormalizationFormState>(defaultNormalizationFormState);
  const [requestFileType, setRequestFileType] = useState<RequestFileType>('auto');
  const [exportOptions, setExportOptions] = useState<ExportOptions>(defaultExportOptions);
  const [activeDiffId, setActiveDiffId] = useState<string | null>(null);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetLoading, setPresetLoading] = useState(true);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetBusyId, setPresetBusyId] = useState<string | null>(null);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [annotationsByDiffId, setAnnotationsByDiffId] = useState<Record<string, DiffAnnotation>>({});
  const [annotationEntry, setAnnotationEntry] = useState<DiffListEntry | null>(null);
  const [annotationSaving, setAnnotationSaving] = useState(false);
  const diffEntries = useMemo(
    () => (response ? flattenChangedDiffItems(response.result) : []),
    [response]
  );
  const denseRegion = useMemo(
    () => (response ? findDensestRegion(response.fileType, response.result) : null),
    [response]
  );
  const activeVersionInterval = useMemo(
    () =>
      versionResponse?.intervals.find((interval) => interval.id === activeVersionIntervalId) ??
      versionResponse?.intervals[0] ??
      null,
    [activeVersionIntervalId, versionResponse]
  );
  const versionDiffEntries = useMemo(
    () => (activeVersionInterval ? flattenChangedDiffItems(activeVersionInterval.result) : []),
    [activeVersionInterval]
  );
  const versionDenseRegion = useMemo(
    () =>
      versionResponse && activeVersionInterval
        ? findDensestRegion(versionResponse.fileType, activeVersionInterval.result)
        : null,
    [activeVersionInterval, versionResponse]
  );
  const activeDiffIndex = diffEntries.findIndex((entry) => entry.diffId === activeDiffId);
  const activeVersionDiffIndex = versionDiffEntries.findIndex(
    (entry) => entry.diffId === activeVersionDiffId
  );
  const currentJobId = response?.jobId ?? versionResponse?.jobId ?? null;

  useEffect(() => {
    setAdvancedRules(loadAdvancedRuleFormState());
    setNormalization(loadNormalizationFormState());
  }, []);

  useEffect(() => {
    fetchUserSettings()
      .then((settings) => {
        applyThemePreference(settings.theme);

        if (presetAppliedRef.current) {
          return;
        }

        setRequestFileType(settings.defaultFileType);
        setFilterOptions(normalizeFiltersForForm(settings.defaultFilters));
        setAdvancedRules(normalizeAdvancedRulesForForm(settings.defaultAdvancedRules));
        setNormalization(normalizeNormalizationForForm(settings.defaultNormalization));
      })
      .catch((requestError: unknown) => {
        setNotice(requestError instanceof Error ? requestError.message : '个人默认设置加载失败');
      });
  }, []);

  useEffect(() => {
    listFilterPresets()
      .then((presets) => {
        setFilterPresets(presets);
        setSelectedPresetId((currentId) => currentId || presets.find((preset) => preset.isDefault)?.id || '');
      })
      .catch((requestError: unknown) => {
        setNotice(requestError instanceof Error ? requestError.message : '规则预设加载失败');
      })
      .finally(() => {
        setPresetLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!currentJobId) {
      setAnnotationsByDiffId({});
      setAnnotationEntry(null);
      return;
    }

    listDiffAnnotations(currentJobId)
      .then((annotations) => {
        setAnnotationsByDiffId(
          Object.fromEntries(annotations.map((annotation) => [annotation.diffId, annotation]))
        );
      })
      .catch((requestError: unknown) => {
        setNotice(requestError instanceof Error ? requestError.message : '差异备注加载失败');
      });
  }, [currentJobId]);

  useEffect(() => {
    if (locationState?.versionResult) {
      const firstInterval = locationState.versionResult.intervals[0] ?? null;

      setVersionResponse(locationState.versionResult);
      setResponse(null);
      setActiveDiffId(null);
      setActiveVersionIntervalId(firstInterval?.id ?? null);
      setActiveVersionDiffId(getFirstDiffId(firstInterval));
      setNotice('已从对比任务中心恢复多版本结果。');
      return;
    }

    if (!locationState?.compareResult) {
      return;
    }

    const entries = flattenChangedDiffItems(locationState.compareResult.result);
    setResponse(locationState.compareResult);
    setVersionResponse(null);
    setActiveDiffId(entries[0]?.diffId ?? null);
    setActiveVersionIntervalId(null);
    setActiveVersionDiffId(null);
    setNotice(
      locationState.restoreSource === 'job'
        ? '已从对比任务中心恢复结果。'
        : '已从历史记录恢复对比结果。'
    );
  }, [locationState?.compareResult, locationState?.restoreSource, locationState?.versionResult]);

  function handleFilterChange(key: DiffFilterKey, enabled: boolean) {
    setFilterOptions((currentOptions) => ({
      ...currentOptions,
      [key]: enabled
    }));
  }

  function handleAdvancedRulesChange(nextState: Partial<AdvancedRuleFormState>) {
    setAdvancedRules((currentState) => ({
      ...currentState,
      ...nextState
    }));
  }

  function handleNormalizationChange(nextState: Partial<NormalizationFormState>) {
    setNormalization((currentState) => ({
      ...currentState,
      ...nextState
    }));
  }

  function handleApplyPreset() {
    const preset = filterPresets.find((item) => item.id === selectedPresetId);

    if (!preset) {
      return;
    }

    presetAppliedRef.current = true;
    setFilterOptions(preset.filters);
    setAdvancedRules(normalizeAdvancedRulesForForm(preset.advancedRules));
    setNormalization(normalizeNormalizationForForm(preset.normalization));
    setRequestFileType(preset.fileType);
    setNotice(`已应用规则预设：${preset.name}`);
  }

  async function refreshFilterPresets(selectedId?: string) {
    const presets = await listFilterPresets();

    setFilterPresets(presets);
    setSelectedPresetId(selectedId ?? presets.find((preset) => preset.isDefault)?.id ?? '');
    return presets;
  }

  async function handleSavePreset() {
    const name = presetName.trim();

    if (!name) {
      return;
    }

    setPresetSaving(true);
    setError('');
    setNotice('');

    try {
      const preset = await createFilterPreset({
        name,
        description: presetDescription.trim() || null,
        fileType: requestFileType,
        filters: filterOptions,
        advancedRules,
        normalization
      });

      await refreshFilterPresets(preset.id);
      setPresetName('');
      setPresetDescription('');
      setNotice(`已保存规则预设：${preset.name}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '规则预设保存失败');
    } finally {
      setPresetSaving(false);
    }
  }

  async function handleUpdatePreset(
    presetId: string,
    input: {
      name: string;
      description: string | null;
      fileType: RequestFileType;
    }
  ) {
    setPresetBusyId(presetId);
    setError('');

    try {
      await updateFilterPreset(presetId, input);
      await refreshFilterPresets(presetId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '规则预设更新失败');
    } finally {
      setPresetBusyId(null);
    }
  }

  async function handleDeletePreset(presetId: string) {
    setPresetBusyId(presetId);
    setError('');

    try {
      await deleteFilterPreset(presetId);
      await refreshFilterPresets(selectedPresetId === presetId ? undefined : selectedPresetId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '规则预设删除失败');
    } finally {
      setPresetBusyId(null);
    }
  }

  async function handleSetDefaultPreset(presetId: string) {
    setPresetBusyId(presetId);
    setError('');

    try {
      await setDefaultFilterPreset(presetId);
      await refreshFilterPresets(presetId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '默认规则预设设置失败');
    } finally {
      setPresetBusyId(null);
    }
  }

  function handleOpenAnnotation(entry: DiffListEntry) {
    setAnnotationEntry(entry);

    if (response) {
      setActiveDiffId(entry.diffId);
    }

    if (versionResponse) {
      setActiveVersionDiffId(entry.diffId);
    }
  }

  async function handleSaveAnnotation(input: { note: string; tag: DiffAnnotation['tag']; resolved: boolean }) {
    if (!currentJobId || !annotationEntry) {
      return;
    }

    setAnnotationSaving(true);
    setError('');
    setNotice('');

    try {
      const existingAnnotation = annotationsByDiffId[annotationEntry.diffId];
      const annotation = existingAnnotation
        ? await updateDiffAnnotation(existingAnnotation.id, input)
        : await createDiffAnnotation(currentJobId, {
            diffId: annotationEntry.diffId,
            ...input
          });

      setAnnotationsByDiffId((currentAnnotations) => ({
        ...currentAnnotations,
        [annotation.diffId]: annotation
      }));
      setNotice('差异备注已保存。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '差异备注保存失败');
    } finally {
      setAnnotationSaving(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError('');
    setNotice('');
    setVersionError('');
    setVersionNotice('');
    setResponse(null);
    setVersionResponse(null);
    setAnnotationEntry(null);
    setActiveDiffId(null);
    setActiveVersionIntervalId(null);
    setActiveVersionDiffId(null);

    try {
      const result = await compareFiles(formData);
      const entries = flattenChangedDiffItems(result.result);
      setResponse(result);
      setActiveDiffId(entries[0]?.diffId ?? null);
      try {
        await addHistoryRecord(result);
        setNotice(
          result.jobId
            ? `对比完成，已保存到历史记录和任务中心（任务 #${result.jobId}）。`
            : '对比完成，已保存到当前账号的历史记录。'
        );
      } catch (historyError) {
        setNotice(
          `对比完成，但后端历史记录保存失败，已临时保存到本地：${
            historyError instanceof Error ? historyError.message : '未知错误'
          }`
        );
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '请求失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVersionSubmit(formData: FormData) {
    setVersionSubmitting(true);
    setVersionError('');
    setVersionNotice('');
    setError('');
    setNotice('');
    setResponse(null);
    setVersionResponse(null);
    setAnnotationEntry(null);
    setActiveDiffId(null);
    setActiveVersionIntervalId(null);
    setActiveVersionDiffId(null);

    try {
      const result = await compareVersionFiles(formData);
      const firstInterval = result.intervals[0] ?? null;

      setVersionResponse(result);
      setActiveVersionIntervalId(firstInterval?.id ?? null);
      setActiveVersionDiffId(getFirstDiffId(firstInterval));
      setVersionNotice(result.message ?? '多版本连续对比完成。');
    } catch (requestError) {
      setVersionError(requestError instanceof Error ? requestError.message : '多版本对比请求失败');
    } finally {
      setVersionSubmitting(false);
    }
  }

  function handleVersionIntervalSelect(intervalId: string) {
    const interval = versionResponse?.intervals.find((item) => item.id === intervalId) ?? null;

    setActiveVersionIntervalId(intervalId);
    setActiveVersionDiffId(getFirstDiffId(interval));
  }

  async function handleExport(format: 'html' | 'pdf') {
    if (!response) {
      return;
    }

    setError('');
    setNotice('');
    setExportingFormat(format);

    try {
      const exportResult = await exportCompareResult({
        compareResult: response,
        format,
        jobId: currentJobId,
        options: exportOptions,
        selectedDiffId: activeDiffId
      });
      setNotice(`已生成 ${format.toUpperCase()} 导出文件：${exportResult.fileName}`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '导出失败');
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-heading page-hero compact-hero">
        <div>
          <p className="eyebrow">Compare Workspace</p>
          <h1>数据差异对比</h1>
          <p className="page-subtitle">
            输入两组数据后，系统会按文本行、JSON 节点或表格单元格生成结构化差异结果。
          </p>
        </div>
        <div className="hero-mini-grid" aria-label="支持的数据类型">
          <span>Text</span>
          <span>JSON</span>
          <span>CSV</span>
          <span>Excel</span>
        </div>
      </header>

      <FilterPresetPanel
        description={presetDescription}
        loading={presetLoading}
        name={presetName}
        onApply={handleApplyPreset}
        onDescriptionChange={setPresetDescription}
        onNameChange={setPresetName}
        onSave={() => void handleSavePreset()}
        onSelectedPresetIdChange={setSelectedPresetId}
        onToggleManager={() => setShowPresetManager((currentValue) => !currentValue)}
        presets={filterPresets}
        saving={presetSaving}
        selectedPresetId={selectedPresetId}
        showManager={showPresetManager}
      />
      {showPresetManager && (
        <FilterPresetManager
          busyPresetId={presetBusyId}
          onDelete={(presetId) => void handleDeletePreset(presetId)}
          onSetDefault={(presetId) => void handleSetDefaultPreset(presetId)}
          onUpdate={(presetId, input) => void handleUpdatePreset(presetId, input)}
          presets={filterPresets}
        />
      )}

      <CompareInputForm
        advancedRules={advancedRules}
        filters={filterOptions}
        normalization={normalization}
        onAdvancedRulesChange={handleAdvancedRulesChange}
        onFilterChange={handleFilterChange}
        onNormalizationChange={handleNormalizationChange}
        onRequestFileTypeChange={setRequestFileType}
        onSubmit={handleSubmit}
        requestFileType={requestFileType}
        submitting={submitting}
      />
      <ActiveFiltersPanel filters={filterOptions} />
      <MultiVersionCompareForm
        filters={filterOptions}
        onSubmit={handleVersionSubmit}
        requestFileType={requestFileType}
        submitting={versionSubmitting}
      />
      <ErrorMessage message={error} />
      <ErrorMessage message={versionError} />
      {notice && <section className="success-message">{notice}</section>}
      {versionNotice && <section className="success-message">{versionNotice}</section>}

      {!response && !versionResponse && !submitting && !versionSubmitting && (
        <section className="empty-state comparison-empty">
          <strong>等待对比任务</strong>
          <span>上传双文件或多版本序列后，结果区会展示统计卡片、版本趋势和可视化明细。</span>
        </section>
      )}

      {response && (
        <section className="result-stack" aria-label="对比结果">
          <ExportPanel
            disabled={!response}
            exportingFormat={exportingFormat}
            onChange={setExportOptions}
            onExport={handleExport}
            options={exportOptions}
          />
          <PerformanceNotice performance={response.performance ?? defaultPerformance} />
          <AdvancedRulesSummaryPanel advancedRules={response.advancedRules} />
          <NormalizationSummaryPanel normalization={response.normalization} />
          <DiffSummaryPanel
            activeIndex={activeDiffIndex}
            denseRegion={denseRegion}
            diffCount={diffEntries.length}
            fileType={response.fileType}
            onJump={setActiveDiffId}
            summary={response.summary}
          />
          <DiffListPanel
            activeDiffId={activeDiffId}
            annotations={annotationsByDiffId}
            entries={diffEntries}
            onAnnotate={handleOpenAnnotation}
            onJump={setActiveDiffId}
          />
          <DiffAnnotationPanel
            annotation={annotationEntry ? (annotationsByDiffId[annotationEntry.diffId] ?? null) : null}
            diff={annotationEntry}
            disabled={!currentJobId}
            onCancel={() => setAnnotationEntry(null)}
            onSave={(input) => void handleSaveAnnotation(input)}
            saving={annotationSaving}
          />
          {renderDiffViewer({
            activeDiffId,
            fileType: response.fileType,
            onJump: setActiveDiffId,
            result: response.result
          })}
        </section>
      )}

      {versionResponse && activeVersionInterval && (
        <section className="result-stack version-result-stack" aria-label="多版本对比结果">
          <VersionTimelinePanel
            activeIntervalId={activeVersionInterval.id}
            onSelectInterval={handleVersionIntervalSelect}
            response={versionResponse}
          />
          <section className="version-interval-heading">
            <div>
              <strong>{activeVersionInterval.label}</strong>
              <span>当前区间详细 diff</span>
            </div>
            <em>
              {activeVersionInterval.summary.total === 0
                ? '无差异'
                : `${activeVersionInterval.summary.total} 项差异`}
            </em>
          </section>
          <PerformanceNotice performance={activeVersionInterval.performance ?? defaultPerformance} />
          <AdvancedRulesSummaryPanel advancedRules={activeVersionInterval.advancedRules} />
          <NormalizationSummaryPanel normalization={activeVersionInterval.normalization} />
          <DiffSummaryPanel
            activeIndex={activeVersionDiffIndex}
            denseRegion={versionDenseRegion}
            diffCount={versionDiffEntries.length}
            fileType={versionResponse.fileType}
            onJump={setActiveVersionDiffId}
            summary={activeVersionInterval.summary}
          />
          <DiffListPanel
            activeDiffId={activeVersionDiffId}
            annotations={annotationsByDiffId}
            entries={versionDiffEntries}
            onAnnotate={handleOpenAnnotation}
            onJump={setActiveVersionDiffId}
          />
          <DiffAnnotationPanel
            annotation={annotationEntry ? (annotationsByDiffId[annotationEntry.diffId] ?? null) : null}
            diff={annotationEntry}
            disabled={!currentJobId}
            onCancel={() => setAnnotationEntry(null)}
            onSave={(input) => void handleSaveAnnotation(input)}
            saving={annotationSaving}
          />
          {renderDiffViewer({
            activeDiffId: activeVersionDiffId,
            fileType: versionResponse.fileType,
            onJump: setActiveVersionDiffId,
            result: activeVersionInterval.result
          })}
        </section>
      )}
    </section>
  );
}
