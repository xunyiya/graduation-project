import { useEffect, useMemo, useState } from 'react';
import type { DiffLineType, JsonDiffNode } from '../../types/api';
import { buildJsonSubtreeCountMap, collectJsonDensityRegions } from './diffDensity';
import { getDiffDomId } from './diffNavigation';
import { VirtualList } from './VirtualList';

interface JsonTreeDiffViewerProps {
  activeDiffId: string | null;
  onJump: (diffId: string) => void;
  result: JsonDiffNode[];
}

function collectExpandablePaths(nodes: JsonDiffNode[]) {
  const paths: string[] = [];

  function walk(node: JsonDiffNode) {
    if (node.children.length > 0) {
      paths.push(node.path);
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);
  return paths;
}

function getNodeClass(type: DiffLineType) {
  return `json-tree-row ${type}`;
}

function findPathByDiffId(nodes: JsonDiffNode[], diffId: string): string | null {
  for (const node of nodes) {
    if (node.meta.diffId === diffId) {
      return node.path;
    }

    const childPath = findPathByDiffId(node.children, diffId);

    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function getAncestorPaths(path: string) {
  const parts: string[] = ['$'];
  let currentPath = '$';
  const tokens = path.slice(2).match(/(?:[^.[\]]+)|(?:\[\d+\])/g) ?? [];

  for (const token of tokens.slice(0, -1)) {
    currentPath = token.startsWith('[') ? `${currentPath}${token}` : `${currentPath}.${token}`;
    parts.push(currentPath);
  }

  return parts;
}

function JsonTreeNode({
  activeDiffId,
  depth,
  isExpanded,
  node,
  subtreeDiffCount,
  onToggle
}: {
  activeDiffId: string | null;
  depth: number;
  isExpanded: boolean;
  node: JsonDiffNode;
  subtreeDiffCount: number;
  onToggle: (path: string) => void;
}) {
  const isExpandable = node.children.length > 0;

  return (
    <div
      className={`${getNodeClass(node.type)}${node.meta.diffId === activeDiffId ? ' active-target' : ''}`}
      id={getDiffDomId(node.meta.diffId)}
    >
      <div className="json-node-main" style={{ paddingLeft: `${10 + depth * 20}px` }}>
        {isExpandable ? (
          <button
            aria-label={isExpanded ? '折叠节点' : '展开节点'}
            className="tree-toggle"
            onClick={() => onToggle(node.path)}
            type="button"
          >
            {isExpanded ? '-' : '+'}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <strong>{node.key}</strong>
        {subtreeDiffCount > 0 && <span className="json-diff-count">{subtreeDiffCount}</span>}
      </div>
      <code className="json-path">{node.path}</code>
      <span className="json-value-type">{node.valueType}</span>
      <code className="json-preview">{node.leftPreview}</code>
      <code className="json-preview">{node.rightPreview}</code>
    </div>
  );
}

interface VisibleJsonNode {
  depth: number;
  node: JsonDiffNode;
}

function flattenVisibleNodes(nodes: JsonDiffNode[], expandedPaths: Set<string>) {
  const visibleNodes: VisibleJsonNode[] = [];

  function walk(node: JsonDiffNode, depth: number) {
    visibleNodes.push({ depth, node });

    if (node.children.length > 0 && expandedPaths.has(node.path)) {
      node.children.forEach((child) => walk(child, depth + 1));
    }
  }

  nodes.forEach((node) => walk(node, 0));
  return visibleNodes;
}

export function JsonTreeDiffViewer({ activeDiffId, onJump, result }: JsonTreeDiffViewerProps) {
  const expandablePaths = useMemo(() => collectExpandablePaths(result), [result]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(expandablePaths));
  const visibleNodes = useMemo(
    () => flattenVisibleNodes(result, expandedPaths),
    [expandedPaths, result]
  );
  const subtreeCountMap = useMemo(() => buildJsonSubtreeCountMap(result), [result]);
  const densityRegions = useMemo(
    () => collectJsonDensityRegions(result).filter((region) => region.label !== '$').slice(0, 8),
    [result]
  );
  const activeIndex = visibleNodes.findIndex(({ node }) => node.meta.diffId === activeDiffId);

  useEffect(() => {
    setExpandedPaths(new Set(expandablePaths));
  }, [expandablePaths]);

  useEffect(() => {
    if (!activeDiffId) {
      return;
    }

    const targetPath = findPathByDiffId(result, activeDiffId);

    if (!targetPath) {
      return;
    }

    setExpandedPaths((currentPaths) => new Set([...currentPaths, ...getAncestorPaths(targetPath)]));
  }, [activeDiffId, result]);

  function toggleNode(path: string) {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);

      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }

      return nextPaths;
    });
  }

  function expandAll() {
    setExpandedPaths(new Set(expandablePaths));
  }

  function collapseAll() {
    setExpandedPaths(new Set());
  }

  if (result.length === 0) {
    return (
      <section className="empty-state">
        <strong>暂无 JSON 差异结果</strong>
        <span>上传或粘贴两份 JSON 后，这里会显示树形差异。</span>
      </section>
    );
  }

  return (
    <section className="json-tree-viewer" aria-label="JSON 树形差异结果">
      <div className="json-tree-toolbar">
        <strong>JSON 树形视图</strong>
        <div className="tree-actions">
          <button onClick={expandAll} type="button">
            展开全部
          </button>
          <button onClick={collapseAll} type="button">
            折叠全部
          </button>
        </div>
      </div>

      {densityRegions.length > 0 && (
        <div className="json-density-map" aria-label="JSON 差异分布">
          <span>差异分布</span>
          <div>
            {densityRegions.map((region) => (
              <button
                className={region.diffId === activeDiffId ? 'active' : ''}
                key={region.diffId}
                onClick={() => onJump(region.diffId)}
                type="button"
              >
                <strong>{region.count}</strong>
                <code>{region.label}</code>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="json-tree-header">
        <span>节点</span>
        <span>路径</span>
        <span>类型</span>
        <span>左侧值</span>
        <span>右侧值</span>
      </div>

      <VirtualList
        activeIndex={activeIndex}
        ariaLabel="JSON 树形差异虚拟滚动区域"
        className="json-tree-body"
        getKey={({ node }) => node.meta.diffId}
        height={680}
        itemHeight={44}
        items={visibleNodes}
        renderItem={({ depth, node }) => (
          <JsonTreeNode
            activeDiffId={activeDiffId}
            depth={depth}
            isExpanded={expandedPaths.has(node.path)}
            node={node}
            subtreeDiffCount={subtreeCountMap.get(node.meta.diffId) ?? 0}
            onToggle={toggleNode}
          />
        )}
      />
    </section>
  );
}
