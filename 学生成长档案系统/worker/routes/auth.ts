import { Hono } from 'hono';
import { loginInputSchema } from '../../shared/validation';
import type { AppEnv } from '../types';
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  requireSession,
  sessionExpiry,
  setSessionCookie,
  verifyPassword,
} from '../lib/auth';
import { ApiException, parseJson } from '../lib/http';

interface AdminCredentials {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
}

const auth = new Hono<AppEnv>();

auth.post('/setup/admin', async (c) => {
  if (!c.env.SETUP_SECRET || c.req.header('x-setup-secret') !== c.env.SETUP_SECRET) {
    throw new ApiException(403, 'SETUP_FORBIDDEN', '初始化凭据无效');
  }
  const existing = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM admins').first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) throw new ApiException(409, 'ADMIN_EXISTS', '管理员已经初始化');

  const input = await parseJson(c, loginInputSchema);
  const password = await hashPassword(input.password);
  const result = await c.env.DB.prepare(
    `INSERT INTO admins (username, password_hash, password_salt, password_iterations)
     VALUES (?, ?, ?, ?)`,
  ).bind(input.username, password.hash, password.salt, password.iterations).run();

  return c.json({ admin: { id: Number(result.meta.last_row_id), username: input.username } }, 201);
});

auth.post('/auth/login', async (c) => {
  const input = await parseJson(c, loginInputSchema);
  const admin = await c.env.DB.prepare(
    `SELECT id, username, password_hash, password_salt, password_iterations
     FROM admins WHERE username = ? COLLATE NOCASE`,
  ).bind(input.username).first<AdminCredentials>();

  const dummySalt = 'AAAAAAAAAAAAAAAAAAAAAA';
  const dummyHash = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const valid = admin
    ? await verifyPassword(input.password, admin.password_hash, admin.password_salt, admin.password_iterations)
    : await verifyPassword(input.password, dummyHash, dummySalt, 100_000);
  if (!admin || !valid) throw new ApiException(401, 'INVALID_CREDENTIALS', '用户名或密码错误');

  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  await c.env.DB.prepare(
    'INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)',
  ).bind(tokenHash, admin.id, sessionExpiry()).run();
  setSessionCookie(c, token, c.env.SESSION_COOKIE_SECURE === 'true', c.env.SESSION_COOKIE_SAMESITE === 'None' ? 'None' : 'Lax');
  return c.json({ admin: { id: admin.id, username: admin.username } });
});

auth.get('/auth/me', requireSession, (c) => c.json({ admin: c.get('admin') }));

auth.post('/auth/logout', requireSession, async (c) => {
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(c.get('sessionTokenHash')).run();
  clearSessionCookie(c, c.env.SESSION_COOKIE_SECURE === 'true', c.env.SESSION_COOKIE_SAMESITE === 'None' ? 'None' : 'Lax');
  return c.body(null, 204);
});

export default auth;
