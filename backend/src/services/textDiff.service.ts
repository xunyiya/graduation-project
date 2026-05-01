import { defaultFilterOptions, normalizeComparableText } from './filter.service.js';
import {
  applyTextAdvancedRules,
  buildAdvancedRulesInfo,
  defaultAdvancedRuleOptions
} from './advancedRules.service.js';
import {
  buildPerformanceInfo,
  defaultResultLimit,
  inlineDiffCellLimit,
  textExactLcsCellLimit
} from './performance.service.js';
import type {
  AdvancedRuleIgnoredDifference,
  AdvancedRuleOptions,
  AppliedAdvancedRulesInfo,
  DiffItemMeta,
  DiffFilterOptions,
  DiffLineItem,
  DiffLineSide,
  DiffSummary,
  InlineSegment,
  InlineSegmentType
} from '../types/api.js';

interface TextLine {
  lineNumber: number;
  content: string;
  compareKey: string;
}

interface PreprocessedTextLines {
  lines: TextLine[];
  ignoredDifferences: AdvancedRuleIgnoredDifference[];
  warnings: string[];
}

type RawDiffOperation =
  | {
      type: 'unchanged';
      left: TextLine;
      right: TextLine;
    }
  | {
      type: 'removed';
      left: TextLine;
    }
  | {
      type: 'added';
      right: TextLine;
    };

interface DiffBlock {
  removed: Extract<RawDiffOperation, { type: 'removed' }>[];
  added: Extract<RawDiffOperation, { type: 'added' }>[];
}

function splitLines(text: string) {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (normalizedText.length === 0) {
    return [];
  }

  const lines = normalizedText.split('\n');

  if (lines.at(-1) === '') {
    lines.pop();
  }

  return lines;
}

function preprocessTextLines(
  text: string,
  filters: DiffFilterOptions,
  advancedRuleOptions: AdvancedRuleOptions,
  side: 'left' | 'right'
): PreprocessedTextLines {
  const lines: TextLine[] = [];
  const ignoredDifferences: AdvancedRuleIgnoredDifference[] = [];
  const warnings: string[] = [];

  splitLines(text).forEach((content, index) => {
    const advancedResult = applyTextAdvancedRules({
      content,
      lineNumber: index + 1,
      options: advancedRuleOptions,
      side
    });

    ignoredDifferences.push(...advancedResult.ignoredDifferences);
    warnings.push(...advancedResult.warnings);

    if (advancedResult.ignoredLine) {
      return;
    }

    lines.push({
      lineNumber: index + 1,
      content,
      compareKey: normalizeComparableText(advancedResult.compareContent, filters)
    });
  });

  return {
    lines,
    ignoredDifferences,
    warnings
  };
}

function isSameLine(left: TextLine, right: TextLine) {
  return left.compareKey === right.compareKey;
}

function buildLcsTable(leftLines: TextLine[], rightLines: TextLine[]) {
  const table = Array.from({ length: leftLines.length + 1 }, () =>
    Array<number>(rightLines.length + 1).fill(0)
  );

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (isSameLine(leftLines[leftIndex], rightLines[rightIndex])) {
        table[leftIndex][rightIndex] = table[leftIndex + 1][rightIndex + 1] + 1;
      } else {
        table[leftIndex][rightIndex] = Math.max(
          table[leftIndex + 1][rightIndex],
          table[leftIndex][rightIndex + 1]
        );
      }
    }
  }

  return table;
}

function buildRawOperations(leftLines: TextLine[], rightLines: TextLine[]) {
  const table = buildLcsTable(leftLines, rightLines);
  const operations: RawDiffOperation[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    if (isSameLine(leftLines[leftIndex], rightLines[rightIndex])) {
      operations.push({
        type: 'unchanged',
        left: leftLines[leftIndex],
        right: rightLines[rightIndex]
      });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      operations.push({
        type: 'removed',
        left: leftLines[leftIndex]
      });
      leftIndex += 1;
    } else {
      operations.push({
        type: 'added',
        right: rightLines[rightIndex]
      });
      rightIndex += 1;
    }
  }

  while (leftIndex < leftLines.length) {
    operations.push({
      type: 'removed',
      left: leftLines[leftIndex]
    });
    leftIndex += 1;
  }

  while (rightIndex < rightLines.length) {
    operations.push({
      type: 'added',
      right: rightLines[rightIndex]
    });
    rightIndex += 1;
  }

  return operations;
}

function appendSegment(segments: InlineSegment[], type: InlineSegmentType, text: string) {
  if (text.length === 0) {
    return;
  }

  const lastSegment = segments.at(-1);

  if (lastSegment?.type === type) {
    lastSegment.text += text;
    return;
  }

  segments.push({
    type,
    text
  });
}

function buildCharLcsTable(leftText: string, rightText: string) {
  const table = Array.from({ length: leftText.length + 1 }, () =>
    Array<number>(rightText.length + 1).fill(0)
  );

  for (let leftIndex = leftText.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightText.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (leftText[leftIndex] === rightText[rightIndex]) {
        table[leftIndex][rightIndex] = table[leftIndex + 1][rightIndex + 1] + 1;
      } else {
        table[leftIndex][rightIndex] = Math.max(
          table[leftIndex + 1][rightIndex],
          table[leftIndex][rightIndex + 1]
        );
      }
    }
  }

  return table;
}

function buildInlineSegments(leftText: string, rightText: string) {
  if (leftText.length * rightText.length > inlineDiffCellLimit) {
    return {
      leftSegments: [
        {
          type: 'changed' as const,
          text: leftText
        }
      ],
      rightSegments: [
        {
          type: 'changed' as const,
          text: rightText
        }
      ]
    };
  }

  const table = buildCharLcsTable(leftText, rightText);
  const leftSegments: InlineSegment[] = [];
  const rightSegments: InlineSegment[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftText.length && rightIndex < rightText.length) {
    if (leftText[leftIndex] === rightText[rightIndex]) {
      appendSegment(leftSegments, 'unchanged', leftText[leftIndex]);
      appendSegment(rightSegments, 'unchanged', rightText[rightIndex]);
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      appendSegment(leftSegments, 'changed', leftText[leftIndex]);
      leftIndex += 1;
    } else {
      appendSegment(rightSegments, 'changed', rightText[rightIndex]);
      rightIndex += 1;
    }
  }

  while (leftIndex < leftText.length) {
    appendSegment(leftSegments, 'changed', leftText[leftIndex]);
    leftIndex += 1;
  }

  while (rightIndex < rightText.length) {
    appendSegment(rightSegments, 'changed', rightText[rightIndex]);
    rightIndex += 1;
  }

  return {
    leftSegments,
    rightSegments
  };
}

function createSide(line: TextLine, segments?: InlineSegment[]): DiffLineSide {
  return {
    lineNumber: line.lineNumber,
    content: line.content,
    segments:
      segments && segments.length > 0
        ? segments
        : [
            {
              type: 'unchanged',
              text: line.content
            }
          ]
  };
}

function createTextMeta({
  id,
  type,
  left,
  right
}: {
  id: number;
  type: DiffLineItem['type'];
  left: TextLine | null;
  right: TextLine | null;
}): DiffItemMeta {
  const lineNumber = left?.lineNumber ?? right?.lineNumber ?? null;

  return {
    diffId: `text-${id}`,
    kind: 'text-line',
    type,
    label: lineNumber ? `第 ${lineNumber} 行` : `文本差异 ${id}`,
    path: lineNumber ? `line:${lineNumber}` : `text:${id}`,
    location: {
      kind: 'text',
      lineNumber
    },
    leftValue: left?.content ?? null,
    rightValue: right?.content ?? null
  };
}

function appendChangedBlock(rows: DiffLineItem[], block: DiffBlock) {
  const pairCount = Math.min(block.removed.length, block.added.length);

  for (let index = 0; index < pairCount; index += 1) {
    const removed = block.removed[index];
    const added = block.added[index];
    const inlineDiff = buildInlineSegments(removed.left.content, added.right.content);

    rows.push({
      kind: 'text-line',
      id: rows.length + 1,
      type: 'modified',
      meta: createTextMeta({
        id: rows.length + 1,
        type: 'modified',
        left: removed.left,
        right: added.right
      }),
      left: createSide(removed.left, inlineDiff.leftSegments),
      right: createSide(added.right, inlineDiff.rightSegments)
    });
  }

  for (const removed of block.removed.slice(pairCount)) {
    rows.push({
      kind: 'text-line',
      id: rows.length + 1,
      type: 'removed',
      meta: createTextMeta({
        id: rows.length + 1,
        type: 'removed',
        left: removed.left,
        right: null
      }),
      left: createSide(removed.left, [
        {
          type: 'changed',
          text: removed.left.content
        }
      ]),
      right: null
    });
  }

  for (const added of block.added.slice(pairCount)) {
    rows.push({
      kind: 'text-line',
      id: rows.length + 1,
      type: 'added',
      meta: createTextMeta({
        id: rows.length + 1,
        type: 'added',
        left: null,
        right: added.right
      }),
      left: null,
      right: createSide(added.right, [
        {
          type: 'changed',
          text: added.right.content
        }
      ])
    });
  }
}

function toDiffRows(operations: RawDiffOperation[]) {
  const rows: DiffLineItem[] = [];
  const block: DiffBlock = {
    removed: [],
    added: []
  };

  function flushBlock() {
    if (block.removed.length > 0 || block.added.length > 0) {
      appendChangedBlock(rows, block);
      block.removed = [];
      block.added = [];
    }
  }

  for (const operation of operations) {
    if (operation.type === 'unchanged') {
      flushBlock();
      rows.push({
        kind: 'text-line',
        id: rows.length + 1,
        type: 'unchanged',
        meta: createTextMeta({
          id: rows.length + 1,
          type: 'unchanged',
          left: operation.left,
          right: operation.right
        }),
        left: createSide(operation.left),
        right: createSide(operation.right)
      });
      continue;
    }

    if (operation.type === 'removed') {
      block.removed.push(operation);
    } else {
      block.added.push(operation);
    }
  }

  flushBlock();

  return rows;
}

function summarize(rows: DiffLineItem[]): DiffSummary {
  const summary: DiffSummary = {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };

  for (const row of rows) {
    if (row.type === 'added' || row.type === 'removed' || row.type === 'modified') {
      summary[row.type] += 1;
      summary.total += 1;
    }
  }

  return summary;
}

function createLinearRow({
  id,
  left,
  right,
  type
}: {
  id: number;
  left: TextLine | null;
  right: TextLine | null;
  type: DiffLineItem['type'];
}): DiffLineItem {
  const inlineDiff = left && right ? buildInlineSegments(left.content, right.content) : null;

  return {
    kind: 'text-line',
    id,
    type,
    meta: createTextMeta({
      id,
      type,
      left,
      right
    }),
    left: left
      ? createSide(
          left,
          inlineDiff?.leftSegments ?? [
            {
              type: type === 'unchanged' ? 'unchanged' : 'changed',
              text: left.content
            }
          ]
        )
      : null,
    right: right
      ? createSide(
          right,
          inlineDiff?.rightSegments ?? [
            {
              type: type === 'unchanged' ? 'unchanged' : 'changed',
              text: right.content
            }
          ]
        )
      : null
  };
}

function compareTextLinesLinear(
  leftLines: TextLine[],
  rightLines: TextLine[],
  advancedRules: AppliedAdvancedRulesInfo
) {
  const summary: DiffSummary = {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };
  const result: DiffLineItem[] = [];
  const maxLineCount = Math.max(leftLines.length, rightLines.length);

  for (let index = 0; index < maxLineCount; index += 1) {
    const left = leftLines[index] ?? null;
    const right = rightLines[index] ?? null;

    if (left && right && left.compareKey === right.compareKey) {
      continue;
    }

    const type = left && right ? 'modified' : left ? 'removed' : 'added';
    summary[type] += 1;
    summary.total += 1;

    if (result.length < defaultResultLimit) {
      result.push(
        createLinearRow({
          id: result.length + 1,
          left,
          right,
          type
        })
      );
    }
  }

  return {
    summary,
    result,
    advancedRules,
    performance: buildPerformanceInfo({
      algorithm: 'text-line-by-line',
      resultCount: result.length,
      resultTruncated: summary.total > result.length,
      warnings: ['大文本已自动切换为按行号线性比较，可能无法识别移动行。']
    })
  };
}

export function compareTextLines(
  leftText: string,
  rightText: string,
  filters: DiffFilterOptions = defaultFilterOptions,
  advancedRuleOptions: AdvancedRuleOptions = defaultAdvancedRuleOptions
) {
  const leftPreprocess = preprocessTextLines(leftText, filters, advancedRuleOptions, 'left');
  const rightPreprocess = preprocessTextLines(rightText, filters, advancedRuleOptions, 'right');
  const leftLines = leftPreprocess.lines;
  const rightLines = rightPreprocess.lines;
  const advancedRules = buildAdvancedRulesInfo(
    advancedRuleOptions,
    [...leftPreprocess.ignoredDifferences, ...rightPreprocess.ignoredDifferences],
    [...leftPreprocess.warnings, ...rightPreprocess.warnings]
  );
  const lcsCellCount = leftLines.length * rightLines.length;

  if (lcsCellCount > textExactLcsCellLimit) {
    return compareTextLinesLinear(leftLines, rightLines, advancedRules);
  }

  const rawOperations = buildRawOperations(leftLines, rightLines);
  const allRows = toDiffRows(rawOperations);
  const summary = summarize(allRows);
  const result =
    allRows.length > defaultResultLimit ? allRows.slice(0, defaultResultLimit) : allRows;

  return {
    summary,
    result,
    advancedRules,
    performance: buildPerformanceInfo({
      algorithm: 'text-lcs',
      resultCount: result.length,
      resultTruncated: allRows.length > result.length,
      warnings:
        allRows.length > result.length
          ? ['文本结果过多，接口只返回前部分行用于页面展示。']
          : []
    })
  };
}
