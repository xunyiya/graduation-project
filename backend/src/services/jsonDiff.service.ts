import type {
  AdvancedRuleOptions,
  DiffItemMeta,
  DiffLineType,
  DiffSummary,
  JsonDiffNode,
  JsonValueType,
  NormalizationOptions
} from '../types/api.js';
import {
  applyJsonAdvancedRules,
  defaultAdvancedRuleOptions
} from './advancedRules.service.js';
import {
  buildNormalizationInfo,
  defaultNormalizationOptions,
  normalizeJsonPair
} from './normalization.service.js';
import { buildPerformanceInfo } from './performance.service.js';

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValueType(value: unknown): JsonValueType {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (isRecord(value)) {
    return 'object';
  }

  return typeof value as JsonValueType;
}

function formatValuePreview(value: unknown) {
  if (value === undefined) {
    return '';
  }

  if (isRecord(value)) {
    return '{...}';
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  return JSON.stringify(value);
}

function createJsonMeta({
  key,
  path,
  type,
  leftPreview,
  rightPreview
}: {
  key: string;
  path: string;
  type: DiffLineType;
  leftPreview: string;
  rightPreview: string;
}): DiffItemMeta {
  return {
    diffId: `json-${path}`,
    kind: 'json-node',
    type,
    label: key,
    path,
    location: {
      kind: 'json',
      path
    },
    leftValue: leftPreview || null,
    rightValue: rightPreview || null
  };
}

function formatObjectPath(parentPath: string, key: string) {
  return parentPath === '$' ? `$.${key}` : `${parentPath}.${key}`;
}

function formatArrayPath(parentPath: string, index: number) {
  return `${parentPath}[${index}]`;
}

function buildSingleSideNode({
  value,
  key,
  path,
  type
}: {
  value: unknown;
  key: string;
  path: string;
  type: 'added' | 'removed';
}): JsonDiffNode {
  const valueType = getValueType(value);
  const leftValue = type === 'removed' ? value : undefined;
  const rightValue = type === 'added' ? value : undefined;
  const leftPreview = type === 'removed' ? formatValuePreview(value) : '';
  const rightPreview = type === 'added' ? formatValuePreview(value) : '';

  return {
    kind: 'json-node',
    id: path,
    type,
    meta: createJsonMeta({
      key,
      path,
      type,
      leftPreview,
      rightPreview
    }),
    key,
    path,
    valueType,
    leftValue,
    rightValue,
    leftPreview,
    rightPreview,
    children: buildSingleSideChildren(value, path, type)
  };
}

function buildSingleSideChildren(value: unknown, parentPath: string, type: 'added' | 'removed') {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      buildSingleSideNode({
        value: item,
        key: `[${index}]`,
        path: formatArrayPath(parentPath, index),
        type
      })
    );
  }

  if (isRecord(value)) {
    return Object.keys(value).map((key) =>
      buildSingleSideNode({
        value: value[key],
        key,
        path: formatObjectPath(parentPath, key),
        type
      })
    );
  }

  return [];
}

function mergeObjectKeys(leftValue: JsonObject, rightValue: JsonObject) {
  return [...Object.keys(leftValue), ...Object.keys(rightValue).filter((key) => !(key in leftValue))];
}

function isSamePrimitiveValue(leftValue: unknown, rightValue: unknown) {
  return Object.is(leftValue, rightValue);
}

function diffJsonNode({
  leftValue,
  rightValue,
  key,
  path
}: {
  leftValue: unknown;
  rightValue: unknown;
  key: string;
  path: string;
}): JsonDiffNode {
  const leftType = getValueType(leftValue);
  const rightType = getValueType(rightValue);

  if (leftType !== rightType) {
    const leftPreview = formatValuePreview(leftValue);
    const rightPreview = formatValuePreview(rightValue);

    return {
      kind: 'json-node',
      id: path,
      type: 'modified',
      meta: createJsonMeta({
        key,
        path,
        type: 'modified',
        leftPreview,
        rightPreview
      }),
      key,
      path,
      valueType: rightType,
      leftValue,
      rightValue,
      leftPreview,
      rightPreview,
      children: []
    };
  }

  if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
    const maxLength = Math.max(leftValue.length, rightValue.length);
    const children: JsonDiffNode[] = [];

    for (let index = 0; index < maxLength; index += 1) {
      const childPath = formatArrayPath(path, index);

      if (index >= leftValue.length) {
        children.push(
          buildSingleSideNode({
            value: rightValue[index],
            key: `[${index}]`,
            path: childPath,
            type: 'added'
          })
        );
      } else if (index >= rightValue.length) {
        children.push(
          buildSingleSideNode({
            value: leftValue[index],
            key: `[${index}]`,
            path: childPath,
            type: 'removed'
          })
        );
      } else {
        children.push(
          diffJsonNode({
            leftValue: leftValue[index],
            rightValue: rightValue[index],
            key: `[${index}]`,
            path: childPath
          })
        );
      }
    }

    const leftPreview = formatValuePreview(leftValue);
    const rightPreview = formatValuePreview(rightValue);

    return {
      kind: 'json-node',
      id: path,
      type: 'unchanged',
      meta: createJsonMeta({
        key,
        path,
        type: 'unchanged',
        leftPreview,
        rightPreview
      }),
      key,
      path,
      valueType: 'array',
      leftValue,
      rightValue,
      leftPreview,
      rightPreview,
      children
    };
  }

  if (isRecord(leftValue) && isRecord(rightValue)) {
    const children = mergeObjectKeys(leftValue, rightValue).map((childKey) => {
      const childPath = formatObjectPath(path, childKey);

      if (!(childKey in leftValue)) {
        return buildSingleSideNode({
          value: rightValue[childKey],
          key: childKey,
          path: childPath,
          type: 'added'
        });
      }

      if (!(childKey in rightValue)) {
        return buildSingleSideNode({
          value: leftValue[childKey],
          key: childKey,
          path: childPath,
          type: 'removed'
        });
      }

      return diffJsonNode({
        leftValue: leftValue[childKey],
        rightValue: rightValue[childKey],
        key: childKey,
        path: childPath
      });
    });

    const leftPreview = formatValuePreview(leftValue);
    const rightPreview = formatValuePreview(rightValue);

    return {
      kind: 'json-node',
      id: path,
      type: 'unchanged',
      meta: createJsonMeta({
        key,
        path,
        type: 'unchanged',
        leftPreview,
        rightPreview
      }),
      key,
      path,
      valueType: 'object',
      leftValue,
      rightValue,
      leftPreview,
      rightPreview,
      children
    };
  }

  const type = isSamePrimitiveValue(leftValue, rightValue) ? 'unchanged' : 'modified';
  const leftPreview = formatValuePreview(leftValue);
  const rightPreview = formatValuePreview(rightValue);

  return {
    kind: 'json-node',
    id: path,
    type,
    meta: createJsonMeta({
      key,
      path,
      type,
      leftPreview,
      rightPreview
    }),
    key,
    path,
    valueType: leftType,
    leftValue,
    rightValue,
    leftPreview,
    rightPreview,
    children: []
  };
}

function summarizeNode(node: JsonDiffNode, summary: DiffSummary) {
  const shouldSkipRootContainer = node.path === '$' && node.children.length > 0;

  if (
    !shouldSkipRootContainer &&
    (node.type === 'added' || node.type === 'removed' || node.type === 'modified')
  ) {
    summary[node.type] += 1;
    summary.total += 1;
  }

  for (const child of node.children) {
    summarizeNode(child, summary);
  }
}

function summarize(root: JsonDiffNode): DiffSummary {
  const summary: DiffSummary = {
    total: 0,
    added: 0,
    removed: 0,
    modified: 0
  };

  summarizeNode(root, summary);

  return summary;
}

export function parseJsonText(text: string) {
  return JSON.parse(text) as unknown;
}

export function compareJsonValues(
  leftValue: unknown,
  rightValue: unknown,
  normalizationOptions: NormalizationOptions = defaultNormalizationOptions,
  advancedRuleOptions: AdvancedRuleOptions = defaultAdvancedRuleOptions
) {
  const normalizedPair = normalizeJsonPair(leftValue, rightValue, normalizationOptions);
  const advancedPair = applyJsonAdvancedRules(
    normalizedPair.leftValue,
    normalizedPair.rightValue,
    advancedRuleOptions
  );
  const root = diffJsonNode({
    leftValue: advancedPair.leftValue,
    rightValue: advancedPair.rightValue,
    key: '$',
    path: '$'
  });

  return {
    summary: summarize(root),
    result: [root],
    advancedRules: advancedPair.advancedRules,
    normalization: normalizedPair.normalization ?? buildNormalizationInfo(normalizationOptions),
    performance: buildPerformanceInfo({
      algorithm: 'json-recursive-tree',
      resultCount: 1,
      resultTruncated: false,
      warnings: []
    })
  };
}

export function compareJsonText(
  leftText: string,
  rightText: string,
  normalizationOptions: NormalizationOptions = defaultNormalizationOptions,
  advancedRuleOptions: AdvancedRuleOptions = defaultAdvancedRuleOptions
) {
  const leftValue = parseJsonText(leftText);
  const rightValue = parseJsonText(rightText);

  return compareJsonValues(leftValue, rightValue, normalizationOptions, advancedRuleOptions);
}
