import { beforeEach, describe, expect, it } from 'vitest';
import type { Student, StudyRecord } from '../../shared/contracts';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('study record API', () => {
  let cookie: string;
  let studentId: number;

  beforeEach(async () => {
    await resetDatabase();
    await setupAdmin();
    cookie = (await login()).cookie;
    const response = await jsonRequest('/api/students', cookie, 'POST', {
      name: '张三', grade: '初一', school: '', join_date: null, remark: '',
    });
    studentId = (await response.json<{ student: Student }>()).student.id;
  });

  it('stores ten pages in chronological order with record date separate from creation time', async () => {
    for (let day = 10; day >= 1; day -= 1) {
      const response = await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
        record_date: `2026-08-${String(day).padStart(2, '0')}`,
        content: `第 ${day} 天晚辅反馈`,
      });
      expect(response.status).toBe(201);
    }

    const response = await api(`/api/students/${studentId}/study-records`, { headers: authedHeaders(cookie) });
    const body = await response.json<{ records: StudyRecord[]; total: number }>();
    expect(body.total).toBe(10);
    expect(body.records.map((record) => record.record_date)).toEqual([
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
      '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10',
    ]);
    expect(body.records[0].created_at).not.toBe(body.records[0].record_date);
  });

  it('reorders automatically after editing a record date and supports deletion', async () => {
    const first = await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
      record_date: '2026-08-08', content: '较晚记录',
    });
    const second = await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
      record_date: '2026-08-09', content: '需要补录',
    });
    const original = (await second.json<{ record: StudyRecord }>()).record;

    const updated = await jsonRequest(`/api/study-records/${original.id}`, cookie, 'PUT', {
      record_date: '2026-08-01', content: '补录后排在第一页',
    });
    const edited = (await updated.json<{ record: StudyRecord }>()).record;
    expect(edited.created_at).toBe(original.created_at);

    const list = await api(`/api/students/${studentId}/study-records`, { headers: authedHeaders(cookie) });
    expect((await list.json<{ records: StudyRecord[] }>()).records.map((record) => record.content)).toEqual([
      '补录后排在第一页', '较晚记录',
    ]);

    const firstId = (await first.json<{ record: StudyRecord }>()).record.id;
    expect((await jsonRequest(`/api/study-records/${firstId}`, cookie, 'DELETE')).status).toBe(204);
  });

  it('rejects empty feedback and impossible dates', async () => {
    const response = await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
      record_date: '2026-02-30', content: '  ',
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { fields: { record_date: expect.any(String), content: expect.any(String) } },
    });
  });
});
