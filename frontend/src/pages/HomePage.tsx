import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchHealth } from '../services/api';
import type { HealthResponse } from '../types/api';

const modules = [
  { title: '多源输入', value: '文件 / 文本', description: '支持粘贴内容或上传本地文件。' },
  { title: '格式识别', value: 'Text / JSON / CSV / Excel', description: '自动或手动选择对比类型。' },
  { title: '可视化展示', value: '分栏 / 树形 / 表格', description: '按数据结构呈现差异结果。' },
  { title: '结果沉淀', value: '导出 / 历史', description: '生成报告并保留账号历史。' }
];

const flowSteps = [
  { step: '01', title: '选择类型', description: '自动识别或指定文本、JSON、CSV、Excel。' },
  { step: '02', title: '输入两组数据', description: '上传文件或直接粘贴待对比内容。' },
  { step: '03', title: '查看差异', description: '使用列表定位，并在专业视图区核对细节。' },
  { step: '04', title: '导出留档', description: '保存历史记录，按需导出 HTML 或 PDF。' }
];

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((error: unknown) => {
        setHealthError(error instanceof Error ? error.message : '后端连接失败');
      });
  }, []);

  const healthStatus = health ? 'online' : healthError ? 'offline' : 'checking';
  const healthLabel = health ? '已连接' : healthError ? '未连接' : '检查中';

  return (
    <section className="page-stack">
      <header className="page-heading page-hero home-hero">
        <div>
          <p className="eyebrow">毕业设计系统</p>
          <h1>数据差异对比可视化工具</h1>
          <p className="page-subtitle">
            将文本、JSON 与表格数据的变化转化为可阅读、可定位、可导出的对比报告。
          </p>
          <div className="hero-actions">
            <Link className="primary-button inline-button" to="/compare">
              开始数据对比
            </Link>
            <Link className="secondary-button inline-button" to="/history">
              查看历史记录
            </Link>
          </div>
        </div>
        <div className={`hero-status-card ${healthStatus}`}>
          <span className={`status-dot ${healthStatus}`} />
          <span className="meta-label">后端连接状态</span>
          <strong>{healthLabel}</strong>
          <small>{health?.timestamp || healthError || '正在检测 Express 服务连接...'}</small>
        </div>
      </header>

      <div className={`status-strip ${healthStatus}`}>
        <div>
          <span className="meta-label">后端状态</span>
          <strong>{healthLabel}</strong>
        </div>
        <span className={`status-dot ${healthStatus}`} />
        <span className="muted">{health?.timestamp || healthError || '正在检测 Express 服务连接...'}</span>
      </div>

      <section className="module-grid" aria-label="系统能力概览">
        {modules.map((item) => (
          <article className="module-card" key={item.title}>
            <span>{item.title}</span>
            <strong>{item.value}</strong>
            <small>{item.description}</small>
          </article>
        ))}
      </section>

      <section className="process-panel" aria-label="使用流程">
        <div className="section-heading">
          <span className="eyebrow">Workflow</span>
          <h2>四步完成差异分析</h2>
        </div>
        <div className="process-grid">
          {flowSteps.map((item) => (
            <article className="process-step" key={item.step}>
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
