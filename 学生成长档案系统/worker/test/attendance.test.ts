import { beforeEach, describe, expect, it } from 'vitest';
import type { Student } from '../../shared/contracts';
import { api, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('attendance API', () => {
  let cookie: string;
  let studentId: number;

  beforeEach(async () => {
    await resetDatabase();
    await setupAdmin();
    cookie = (await login()).cookie;
    const response = await jsonRequest('/api/students', cookie, 'POST', { name: '签到学生', grade: '初一', school: '', join_date: null, remark: '' });
    studentId = (await response.json<{ student: Student }>()).student.id;
  });

  it('creates, lists and removes a signed date', async () => {
    const write = await jsonRequest(`/api/students/${studentId}/attendance/2026-08-13`, cookie, 'PUT', { signed: true });
    expect(write.status).toBe(200);
    const listed = await api(`/api/students/${studentId}/attendance?month=2026-08`, { headers: new Headers({ cookie, origin: 'https://app.test' }) });
    expect(await listed.json()).toMatchObject({ month: '2026-08', dates: ['2026-08-13'] });
    await jsonRequest(`/api/students/${studentId}/attendance/2026-08-13`, cookie, 'PUT', { signed: false });
    expect((await api(`/api/students/${studentId}/attendance?month=2026-08`, { headers: new Headers({ cookie, origin: 'https://app.test' }) })).status).toBe(200);
    expect((await (await api(`/api/students/${studentId}/attendance?month=2026-08`, { headers: new Headers({ cookie, origin: 'https://app.test' }) })).json<{ dates: string[] }>()).dates).toEqual([]);
  });
});
