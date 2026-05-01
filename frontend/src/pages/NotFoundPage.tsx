import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">404</p>
        <h1>页面不存在</h1>
      </header>
      <Link className="primary-button inline-button" to="/">
        返回工作台
      </Link>
    </section>
  );
}
