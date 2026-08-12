import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalApi } from './localApi.js';

let tempDir = '';

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'archive-local-api-'));
});

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

function api() {
  return createLocalApi(path.join(tempDir, 'archive-data.json'));
}

async function login(localApi: ReturnType<typeof createLocalApi>) {
  const response = await localApi.handle('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'archive-admin', password: 'archive-admin' }),
  });
  expect(response.ok).toBe(true);
}

describe('local desktop API', () => {
  it('creates students and lists them with tags', async () => {
    const localApi = api();
    await login(localApi);

    const tag = await localApi.handle('/tags', { method: 'POST', body: JSON.stringify({ name: '重点跟进' }) });
    expect(tag.ok).toBe(true);

    const created = await localApi.handle('/students', {
      method: 'POST',
      body: JSON.stringify({ name: '张三', grade: '初一', school: '创新中学', join_date: '', remark: '' }),
    });
    expect(created.ok).toBe(true);
    const studentId = (created.body as { student: { id: number } }).student.id;
    const tagId = (tag.body as { tag: { id: number } }).tag.id;

    await localApi.handle(`/students/${studentId}/tags`, { method: 'PUT', body: JSON.stringify({ tag_ids: [tagId] }) });
    const listed = await localApi.handle('/students');

    expect(listed.ok).toBe(true);
    expect((listed.body as { students: Array<{ name: string; tags: Array<{ name: string }> }> }).students).toEqual([
      expect.objectContaining({ name: '张三', tags: [expect.objectContaining({ name: '重点跟进' })] }),
    ]);
  });

  it('supports custom score subjects and omits empty values from archive scores', async () => {
    const localApi = api();
    await login(localApi);
    const created = await localApi.handle('/students', {
      method: 'POST',
      body: JSON.stringify({ name: '李四', grade: '初二', school: '', join_date: null, remark: '' }),
    });
    const studentId = (created.body as { student: { id: number } }).student.id;
    const subject = await localApi.handle('/score-subjects', { method: 'POST', body: JSON.stringify({ name: '历史' }) });
    const subjectId = (subject.body as { subject: { id: number } }).subject.id;

    await localApi.handle(`/students/${studentId}/scores`, {
      method: 'POST',
      body: JSON.stringify({ exam_name: '期中考试', exam_date: '2026-08-12', remark: '', values: [{ subject_id: subjectId, value: 88 }] }),
    });
    const archive = await localApi.handle(`/students/${studentId}/archive`);

    expect(archive.ok).toBe(true);
    const score = (archive.body as { scores: Array<{ values: Array<{ subject_name: string; value: number }> }> }).scores[0];
    expect(score.values).toEqual([{ subject_id: subjectId, subject_name: '历史', value: 88 }]);
  });
});
