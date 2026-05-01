import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { ErrorMessage } from '../components/compare/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

const featureHighlights = ['多格式差异对比', '结构化结果展示', '历史记录与导出'];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, login, register, user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const locationState = location.state as LoginLocationState | null;
  const redirectTo = locationState?.from?.pathname ?? '/';

  if (!loading && user) {
    return <Navigate replace to={redirectTo} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }

      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '认证请求失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-layout">
        <aside className="auth-intro">
          <p className="eyebrow">Data Diff Visualizer</p>
          <h1>数据差异对比可视化系统</h1>
          <p>
            面向文本、JSON、CSV 与 Excel 的轻量级对比平台，帮助快速定位新增、删除和修改内容。
          </p>
          <div className="auth-feature-list" aria-label="系统功能亮点">
            {featureHighlights.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        </aside>

        <div className="auth-card">
          <div className="page-heading">
            <p className="eyebrow">Account</p>
            <h2>{mode === 'login' ? '登录系统' : '注册账号'}</h2>
            <p className="page-subtitle">
              {mode === 'login' ? '登录后可继续使用对比、导出和历史记录。' : '创建账号后会自动进入系统。'}
            </p>
          </div>

          <div className="auth-switch" role="tablist" aria-label="认证模式">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
              type="button"
            >
              登录
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
              type="button"
            >
              注册
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              用户名
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入用户名"
                required
                value={username}
              />
            </label>
            <label>
              密码
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                required
                type="password"
                value={password}
              />
            </label>
            <ErrorMessage message={error} />
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
