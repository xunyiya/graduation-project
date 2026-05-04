export type FileType = 'text' | 'json' | 'csv' | 'excel';
export type RequestFileType = FileType | 'auto';

export interface HealthResponse {
  success: boolean;
  service: string;
  timestamp: string;
  version: string;
}

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthPayload {
  user: User;
  token: string;
}

export interface DiffSummary {
  total: number;
  added: number;
  removed: number;
  modified: number;
}

export interface DiffPerformanceInfo {
  algorithm: string;
  resultLimit: number;
  resultCount: number;
  resultTruncated: boolean;
  warnings: string[];
}

export type DiffFilterKey = 'ignoreWhitespace' | 'ignoreCase' | 'ignoreComments';

export interface DiffFilterOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreComments: boolean;
}

export interface ActiveFilter {
  key: DiffFilterKey;
  label: string;
}

export interface AppliedFilterInfo {
  options: DiffFilterOptions;
  active: ActiveFilter[];
}

export type AdvancedRuleKey =
  | 'textLineKeyword'
  | 'textRegexContent'
  | 'jsonField'
  | 'jsonPath'
  | 'jsonArrayOrder'
  | 'tableColumn'
  | 'tableRow'
  | 'tableNumericTolerance';

export interface AdvancedRuleOptions {
  enabled: boolean;
  textIgnoredLineKeywords: string[];
  textIgnoredRegexPatterns: string[];
  jsonIgnoredFields: string[];
  jsonIgnoredPaths: string[];
  jsonIgnoreArrayOrder: boolean;
  tableIgnoredColumns: string[];
  tableIgnoredRows: number[];
  tableNumericTolerance: number | null;
}

export interface ActiveAdvancedRule {
  key: AdvancedRuleKey;
  label: string;
}

export interface AdvancedRuleIgnoredDifference {
  rule: AdvancedRuleKey;
  label: string;
  path: string;
  leftValue: string | null;
  rightValue: string | null;
  reason: string;
}

export interface AppliedAdvancedRulesInfo {
  enabled: boolean;
  options: AdvancedRuleOptions;
  active: ActiveAdvancedRule[];
  ignoredDifferences: AdvancedRuleIgnoredDifference[];
  warnings: string[];
}

export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';

export type DiffResultKind = 'text-line' | 'json-node' | 'table-diff';

export type NormalizationRuleKey =
  | 'jsonFieldOrder'
  | 'jsonIgnoredFields'
  | 'emptyValueEquivalence'
  | 'numericTolerance'
  | 'dateFormat'
  | 'tablePrimaryKey';

export interface NormalizationOptions {
  enabled: boolean;
  ignoreJsonFieldOrder: boolean;
  ignoredJsonFields: string[];
  emptyValuesEquivalent: boolean;
  numericTolerance: number | null;
  normalizeDateFormat: boolean;
  tablePrimaryKeyColumns: string[];
}

export interface ActiveNormalizationRule {
  key: NormalizationRuleKey;
  label: string;
}

export interface NormalizationIgnoredDifference {
  rule: NormalizationRuleKey;
  label: string;
  path: string;
  leftValue: string | null;
  rightValue: string | null;
  reason: string;
}

export interface AppliedNormalizationInfo {
  enabled: boolean;
  options: NormalizationOptions;
  active: ActiveNormalizationRule[];
  ignoredDifferences: NormalizationIgnoredDifference[];
  warnings: string[];
}

export interface DiffItemNormalizationMeta {
  ignored: boolean;
  rule: NormalizationRuleKey;
  reason: string;
}

export type DiffLocation =
  | {
      kind: 'text';
      lineNumber: number | null;
    }
  | {
      kind: 'json';
      path: string;
    }
  | {
      kind: 'table';
      sheetName: string | null;
      rowNumber: number | null;
      columnNumber: number | null;
      columnName: string | null;
    };

export interface DiffItemMeta {
  diffId: string;
  kind: DiffResultKind;
  type: DiffLineType;
  label: string;
  path: string;
  location: DiffLocation;
  leftValue: string | null;
  rightValue: string | null;
  normalization?: DiffItemNormalizationMeta;
}

export type InlineSegmentType = 'unchanged' | 'changed';

export interface InlineSegment {
  type: InlineSegmentType;
  text: string;
}

export interface DiffLineSide {
  lineNumber: number;
  content: string;
  segments: InlineSegment[];
}

export interface DiffLineItem {
  kind: 'text-line';
  id: number;
  type: DiffLineType;
  meta: DiffItemMeta;
  left: DiffLineSide | null;
  right: DiffLineSide | null;
}

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonDiffNode {
  kind: 'json-node';
  id: string;
  type: DiffLineType;
  meta: DiffItemMeta;
  key: string;
  path: string;
  valueType: JsonValueType;
  leftValue: unknown;
  rightValue: unknown;
  leftPreview: string;
  rightPreview: string;
  children: JsonDiffNode[];
}

export type TableDiffScope = 'sheet' | 'cell';
export type TableSourceType = 'csv' | 'excel';

export interface TableDiffItem {
  kind: 'table-diff';
  id: string;
  type: DiffLineType;
  meta: DiffItemMeta;
  scope: TableDiffScope;
  sourceType: TableSourceType;
  sheetName: string | null;
  rowNumber: number | null;
  columnNumber: number | null;
  columnName: string | null;
  path: string;
  leftValue: string | null;
  rightValue: string | null;
}

export type DiffResultItem = DiffLineItem | JsonDiffNode | TableDiffItem;

export interface CompareResponse {
  success: boolean;
  jobId?: string;
  fileType: FileType;
  summary: DiffSummary;
  result: DiffResultItem[];
  filters: AppliedFilterInfo;
  advancedRules?: AppliedAdvancedRulesInfo;
  normalization?: AppliedNormalizationInfo;
  performance: DiffPerformanceInfo;
  message?: string;
  received?: Record<string, unknown>;
}

export interface VersionInfo {
  id: string;
  label: string;
  fileName: string | null;
  index: number;
  size: number;
}

export interface VersionIntervalCompare {
  id: string;
  fromVersionId: string;
  toVersionId: string;
  label: string;
  summary: DiffSummary;
  result: DiffResultItem[];
  advancedRules?: AppliedAdvancedRulesInfo;
  normalization?: AppliedNormalizationInfo;
  performance: DiffPerformanceInfo;
}

export type VersionTrendDirection = 'stable' | 'increasing' | 'decreasing' | 'mixed';

export interface VersionTrendSummary {
  intervalCount: number;
  totalDifferences: number;
  peakIntervalId: string | null;
  peakIntervalLabel: string | null;
  peakDifferenceCount: number;
  added: number;
  removed: number;
  modified: number;
  direction: VersionTrendDirection;
}

export interface VersionChainResponse {
  success: boolean;
  jobId?: string;
  fileType: FileType;
  versions: VersionInfo[];
  intervals: VersionIntervalCompare[];
  trend: VersionTrendSummary;
  filters: AppliedFilterInfo;
  advancedRules?: AppliedAdvancedRulesInfo;
  normalization?: AppliedNormalizationInfo;
  message?: string;
  received?: Record<string, unknown>;
}

export interface ExportOptions {
  exportAllDifferences: boolean;
  includeSummary: boolean;
  includeFileInfo: boolean;
}

export interface ExportRequestBody {
  compareResult: CompareResponse;
  options: ExportOptions;
  selectedDiffId?: string | null;
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  fileType: FileType;
  fileNames: {
    left: string;
    right: string;
  };
  summary: DiffSummary;
  filters: AppliedFilterInfo;
  compareResult: CompareResponse;
}

export interface UploadedFileRecord {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number;
  sha256Prefix: string | null;
  sourceType: string;
  createdAt: string;
}

export interface CompareJobFileRecord {
  id: string;
  fileId: string | null;
  role: string;
  versionIndex: number | null;
  displayName: string;
  createdAt: string;
}

export interface CompareJobRecord {
  id: string;
  title: string;
  fileType: FileType;
  inputMode: 'pair' | 'versions';
  status: string;
  algorithm: string | null;
  durationMs: number;
  resultCount: number;
  resultTruncated: boolean;
  createdAt: string;
  updatedAt: string;
  files?: CompareJobFileRecord[];
  compareResult?: CompareResponse;
  versionResult?: VersionChainResponse;
}
