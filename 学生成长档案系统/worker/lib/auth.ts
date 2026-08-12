import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { SessionAdmin } from '../../shared/contracts';
import type { AppEnv } from '../types';
import { ApiException } from './http';

const COOKIE_NAME = 'archive_session';
// Keep password verification within the CPU budget of the production Worker.
// The schema enforces 100,000 as the minimum accepted PBKDF2 work factor.
const PASSWORD_ITERATIONS = 100_000;
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string; iterations: number }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await derivePassword(password, saltBytes, PASSWORD_ITERATIONS);
  return {
    hash: bytesToBase64Url(hashBytes),
    salt: bytesToBase64Url(saltBytes),
    iterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(password: string, hash: string, salt: string, iterations: number): Promise<boolean> {
  const actual = await derivePassword(password, base64UrlToBytes(salt), iterations);
  return equalBytes(actual, base64UrlToBytes(hash));
}

export function createSessionToken(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function setSessionCookie(c: Parameters<typeof setCookie>[0], token: string, secure: boolean): void {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export function clearSessionCookie(c: Parameters<typeof setCookie>[0], secure: boolean): void {
  setCookie(c, COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    path: '/',
    maxAge: 0,
  });
}

export function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
}

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) throw new ApiException(401, 'UNAUTHENTICATED', '请先登录');

  const tokenHash = await hashSessionToken(token);
  const row = await c.env.DB.prepare(
    `SELECT a.id, a.username, s.expires_at
     FROM sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ?`,
  ).bind(tokenHash).first<SessionAdmin & { expires_at: string }>();

  if (!row || row.expires_at <= new Date().toISOString()) {
    if (row) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    clearSessionCookie(c, c.env.SESSION_COOKIE_SECURE === 'true');
    throw new ApiException(401, 'UNAUTHENTICATED', '登录已失效，请重新登录');
  }

  c.set('admin', { id: row.id, username: row.username });
  c.set('sessionTokenHash', tokenHash);
  await next();
});
