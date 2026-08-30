import { env, exports } from 'cloudflare:workers';

const APP_URL = 'https://app.test';
const workerExports = exports as unknown as { default: Fetcher };

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  return workerExports.default.fetch(new Request(`${APP_URL}${path}`, init));
}

export async function resetAuth(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions'),
    env.DB.prepare('DELETE FROM admins'),
    env.DB.prepare("DELETE FROM sqlite_sequence WHERE name = 'admins'"),
  ]);
}

export async function resetDatabase(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM attendance_records'),
    env.DB.prepare('DELETE FROM score_values'),
    env.DB.prepare('DELETE FROM course_records'),
    env.DB.prepare('DELETE FROM study_records'),
    env.DB.prepare('DELETE FROM scores'),
    env.DB.prepare('DELETE FROM student_tags'),
    env.DB.prepare('DELETE FROM tags'),
    env.DB.prepare('DELETE FROM students'),
    env.DB.prepare('DELETE FROM sessions'),
    env.DB.prepare('DELETE FROM admins'),
    env.DB.prepare('DELETE FROM score_subjects WHERE is_default = 0'),
    env.DB.prepare("DELETE FROM sqlite_sequence WHERE name IN ('course_records', 'study_records', 'scores', 'tags', 'students', 'admins')"),
  ]);
}

export async function setupAdmin(username = 'admin', password = 'Secret123!'): Promise<Response> {
  return api('/api/setup/admin', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: APP_URL,
      'x-setup-secret': 'test-setup-secret',
    },
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username = 'admin', password = 'Secret123!'): Promise<{ response: Response; cookie: string }> {
  const response = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: APP_URL },
    body: JSON.stringify({ username, password }),
  });
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
  return { response, cookie };
}

export function authedHeaders(cookie: string, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set('cookie', cookie);
  headers.set('origin', APP_URL);
  return headers;
}

export async function jsonRequest(path: string, cookie: string, method: string, body?: unknown): Promise<Response> {
  return api(path, {
    method,
    headers: authedHeaders(cookie, { 'content-type': 'application/json' }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
