import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ApiClientError } from '../api/client';
import { useAuth } from './context';

export function LoginPage() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="page-loading" role="status">正在打开档案室…</div>;
  if (admin) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : '暂时无法登录，请稍后重试');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-sheet" aria-labelledby="login-title">
        <img className="login-brand-logo" src={`${import.meta.env.BASE_URL}brand/innovation-academy-logo.jpg`} alt="创新学苑教育" />
        <p className="eyebrow">教育机构内部档案室</p>
        <h1 id="login-title">学生成长档案</h1>
        <p className="login-intro">请使用管理员账号进入，查阅并维护学生的长期成长记录。</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>用户名</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label>
            <span>密码</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="form-alert" role="alert">{error}</p>}
          <button className="button button-primary button-wide" type="submit" disabled={submitting}>
            {submitting ? '正在登录…' : '登录档案系统'}
          </button>
        </form>
      </section>
    </main>
  );
}
