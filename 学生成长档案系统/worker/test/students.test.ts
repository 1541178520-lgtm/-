import { beforeEach, describe, expect, it } from 'vitest';
import type { Student } from '../../shared/contracts';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('student API', () => {
  let cookie: string;

  beforeEach(async () => {
    await resetDatabase();
    await setupAdmin();
    cookie = (await login()).cookie;
  });

  it('creates students, returns stable grade/name order, and searches names by Chinese substring', async () => {
    for (const input of [
      { name: '王小明', grade: '初二', school: '南山中学', join_date: '2026-02-10', remark: '' },
      { name: '张三', grade: '初一', school: '', join_date: null, remark: '数学提升' },
      { name: '张小雨', grade: '初一', school: '实验学校', join_date: '', remark: '' },
    ]) {
      expect((await jsonRequest('/api/students', cookie, 'POST', input)).status).toBe(201);
    }

    const list = await api('/api/students', { headers: authedHeaders(cookie) });
    const body = await list.json<{ students: Student[] }>();
    expect(body.students.map(({ grade, name }) => `${grade}:${name}`)).toEqual([
      '初一:张三',
      '初一:张小雨',
      '初二:王小明',
    ]);
    expect(body.students[0].tags).toEqual([]);

    const search = await api('/api/students?search=%E5%BC%A0', { headers: authedHeaders(cookie) });
    const found = await search.json<{ students: Student[] }>();
    expect(found.students.map((student) => student.name)).toEqual(['张三', '张小雨']);
  });

  it('edits and deletes a student while preserving creation time', async () => {
    const created = await jsonRequest('/api/students', cookie, 'POST', {
      name: '李四', grade: '初一', school: '', join_date: null, remark: '',
    });
    const original = (await created.json<{ student: Student }>()).student;

    const updated = await jsonRequest(`/api/students/${original.id}`, cookie, 'PUT', {
      name: '李小四', grade: '初二', school: '育才中学', join_date: '2026-03-01', remark: '重点关注',
    });
    const edited = (await updated.json<{ student: Student }>()).student;
    expect(edited).toMatchObject({ name: '李小四', grade: '初二', school: '育才中学', join_date: '2026-03-01' });
    expect(edited.created_at).toBe(original.created_at);

    expect((await jsonRequest(`/api/students/${original.id}`, cookie, 'DELETE')).status).toBe(204);
    expect((await api(`/api/students/${original.id}`, { headers: authedHeaders(cookie) })).status).toBe(404);
  });

  it('returns field errors for empty names and impossible calendar dates', async () => {
    const response = await jsonRequest('/api/students', cookie, 'POST', {
      name: '  ', grade: '初一', school: '', join_date: '2026-02-31', remark: '',
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', fields: { name: expect.any(String), join_date: expect.any(String) } },
    });
  });
});
