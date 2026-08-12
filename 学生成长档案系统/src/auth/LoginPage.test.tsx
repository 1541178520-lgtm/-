import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { LoginPage } from './LoginPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function renderLogin(): void {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<h1>档案主页</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows Innovation Academy branding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: '请先登录' } }, 401)));
    renderLogin();

    expect(await screen.findByRole('img', { name: '创新学苑教育' })).toHaveAttribute('src', '/brand/innovation-academy-logo.jpg');
  });

  it('keeps the username and shows the server error after invalid credentials', async () => {
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: '请先登录' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' } }, 401));
    vi.stubGlobal('fetch', fetchStub);
    renderLogin();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('用户名'), 'teacher-admin');
    await user.type(screen.getByLabelText('密码'), 'WrongPassword!');
    await user.click(screen.getByRole('button', { name: '登录档案系统' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码错误');
    expect(screen.getByLabelText('用户名')).toHaveValue('teacher-admin');
  });

  it('navigates to the archive workspace after a successful login', async () => {
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: '请先登录' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ admin: { id: 1, username: 'admin' } }));
    vi.stubGlobal('fetch', fetchStub);
    renderLogin();

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: '登录档案系统' }));

    expect(await screen.findByRole('heading', { name: '档案主页' })).toBeInTheDocument();
  });
});
