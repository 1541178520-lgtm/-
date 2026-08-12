import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, authedHeaders, login, resetAuth, setupAdmin } from './helpers';

describe('administrator authentication', () => {
  beforeEach(resetAuth);

  it('initializes one administrator and never stores the plaintext password', async () => {
    const response = await setupAdmin();
    expect(response.status).toBe(201);

    const admin = await env.DB.prepare(
      'SELECT username, password_hash, password_salt, password_iterations FROM admins',
    ).first<{ username: string; password_hash: string; password_salt: string; password_iterations: number }>();
    expect(admin?.username).toBe('admin');
    expect(admin?.password_hash).not.toContain('Secret123!');
    expect(admin?.password_hash).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(admin?.password_salt).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(admin?.password_iterations).toBe(100_000);

    const duplicate = await setupAdmin('other-admin', 'Another123!');
    expect(duplicate.status).toBe(409);
  });

  it('rejects an invalid setup secret', async () => {
    const response = await api('/api/setup/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://app.test', 'x-setup-secret': 'wrong' },
      body: JSON.stringify({ username: 'admin', password: 'Secret123!' }),
    });
    expect(response.status).toBe(403);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM admins').first<{ count: number }>()).toEqual({ count: 0 });
  });

  it('uses one generic error for bad credentials and sets a secure session cookie on success', async () => {
    await setupAdmin();

    const missingUser = await login('missing', 'Secret123!');
    const wrongPassword = await login('admin', 'WrongSecret123!');
    expect(missingUser.response.status).toBe(401);
    expect(await missingUser.response.json()).toEqual(await wrongPassword.response.json());

    const success = await login();
    expect(success.response.status).toBe(200);
    expect(success.cookie).toMatch(/^archive_session=[A-Za-z0-9_-]+$/);
    expect(success.response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(success.response.headers.get('set-cookie')).toMatch(/SameSite=Lax/i);
    expect(success.response.headers.get('set-cookie')).toMatch(/Secure/i);

    const me = await api('/api/auth/me', { headers: authedHeaders(success.cookie) });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ admin: { id: 1, username: 'admin' } });
  });

  it('rejects expired sessions and removes them from D1', async () => {
    await setupAdmin();
    const { cookie } = await login();
    await env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();

    const response = await api('/api/auth/me', { headers: authedHeaders(cookie) });
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions').first<{ count: number }>()).toEqual({ count: 0 });
  });

  it('logs out by revoking the server session and clearing the cookie', async () => {
    await setupAdmin();
    const { cookie } = await login();

    const logout = await api('/api/auth/logout', { method: 'POST', headers: authedHeaders(cookie) });
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toMatch(/Max-Age=0/i);

    const me = await api('/api/auth/me', { headers: authedHeaders(cookie) });
    expect(me.status).toBe(401);
  });

  it('blocks anonymous data reads and writes and rejects cross-origin authenticated writes', async () => {
    expect((await api('/api/students')).status).toBe(401);
    expect((await api('/api/students', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://app.test' },
      body: JSON.stringify({ name: '张三', grade: '初一' }),
    })).status).toBe(401);

    await setupAdmin();
    const { cookie } = await login();
    const crossOrigin = await api('/api/students', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, origin: 'https://attacker.test' },
      body: JSON.stringify({ name: '张三', grade: '初一' }),
    });
    expect(crossOrigin.status).toBe(403);
  });
});
