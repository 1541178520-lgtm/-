import { beforeEach, describe, expect, it } from 'vitest';
import type { Student, Tag } from '../../shared/contracts';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('tag API', () => {
  let cookie: string;
  let studentId: number;

  beforeEach(async () => {
    await resetDatabase();
    await setupAdmin();
    cookie = (await login()).cookie;
    const created = await jsonRequest('/api/students', cookie, 'POST', {
      name: '张三', grade: '初一', school: '', join_date: null, remark: '',
    });
    studentId = (await created.json<{ student: Student }>()).student.id;
  });

  it('creates, lists, renames, and rejects duplicate tag names', async () => {
    const first = await jsonRequest('/api/tags', cookie, 'POST', { name: ' 数学提升 ' });
    expect(first.status).toBe(201);
    const tag = (await first.json<{ tag: Tag }>()).tag;
    expect(tag.name).toBe('数学提升');

    expect((await jsonRequest('/api/tags', cookie, 'POST', { name: '数学提升' })).status).toBe(409);
    const renamed = await jsonRequest(`/api/tags/${tag.id}`, cookie, 'PUT', { name: '竞赛学生' });
    expect((await renamed.json<{ tag: Tag }>()).tag.name).toBe('竞赛学生');

    const list = await api('/api/tags', { headers: authedHeaders(cookie) });
    expect((await list.json<{ tags: Tag[] }>()).tags.map((item) => item.name)).toEqual(['竞赛学生']);
  });

  it('atomically assigns multiple tags and deleting a tag removes student associations', async () => {
    const tagIds: number[] = [];
    for (const name of ['重点关注', '英语薄弱']) {
      const response = await jsonRequest('/api/tags', cookie, 'POST', { name });
      tagIds.push((await response.json<{ tag: Tag }>()).tag.id);
    }

    const assigned = await jsonRequest(`/api/students/${studentId}/tags`, cookie, 'PUT', { tag_ids: tagIds });
    expect((await assigned.json<{ student: Student }>()).student.tags.map((tag) => tag.name)).toEqual(['英语薄弱', '重点关注']);

    const deleted = await jsonRequest(`/api/tags/${tagIds[0]}`, cookie, 'DELETE');
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: true, affectedStudents: 1 });

    const student = await api(`/api/students/${studentId}`, { headers: authedHeaders(cookie) });
    expect((await student.json<{ student: Student }>()).student.tags.map((tag) => tag.name)).toEqual(['英语薄弱']);
  });

  it('does not change existing associations when any requested tag does not exist', async () => {
    const existing = await jsonRequest('/api/tags', cookie, 'POST', { name: '重点关注' });
    const tagId = (await existing.json<{ tag: Tag }>()).tag.id;
    await jsonRequest(`/api/students/${studentId}/tags`, cookie, 'PUT', { tag_ids: [tagId] });

    const response = await jsonRequest(`/api/students/${studentId}/tags`, cookie, 'PUT', { tag_ids: [tagId, 999] });
    expect(response.status).toBe(422);
    const student = await api(`/api/students/${studentId}`, { headers: authedHeaders(cookie) });
    expect((await student.json<{ student: Student }>()).student.tags.map((tag) => tag.id)).toEqual([tagId]);
  });
});
