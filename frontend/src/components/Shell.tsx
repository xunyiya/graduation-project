import type { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: '工作台', description: '状态与入口' },
  { to: '/compare', label: '数据对比', description: '文本 / JSON / 表格' },
  { to: '/jobs', label: '任务中心', description: '结果与详情' },
  { to: '/history', label: '历史记录', description: '回看与恢复' },
  { to: '/files', label: '文件记录', description: '元数据管理' }
];

export function Shell({ children }: PropsWithChildren) {
  const { loading, logout, user } = useAuth();

  if (!user) {
    return <main className="auth-main-panel">{children}</main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link className="brand" to="/">
            <span className="brand-mark">DD</span>
            <span className="brand-copy">
              <strong>数据差异对比</strong>
              <small>Data Diff Studio</small>
            </span>
          </Link>
          <nav className="nav-list" aria-label="主导航">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                end={item.to === '/'}
                key={item.to}
                to={item.to}
              >
                <span className="nav-label">{item.label}</span>
                <small>{item.description}</small>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-account">
          {loading ? (
            <span>检查登录状态...</span>
          ) : user ? (
            <>
              <span className="account-label">当前用户</span>
              <div className="account-user">
                <span className="account-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                <strong>{user.username}</strong>
              </div>
              <button className="secondary-button logout-button" onClick={() => void logout()} type="button">
                退出登录
              </button>
            </>
          ) : (
            <Link className="nav-link login-link" to="/login">
              登录 / 注册
            </Link>
          )}
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
