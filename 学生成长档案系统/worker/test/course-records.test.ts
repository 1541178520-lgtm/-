import { beforeEach, describe, expect, it } from 'vitest';
import type { CourseRecord, Student } from '../../shared/contracts';
import type { Subject } from '../../shared/constants';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('course record API', () => {
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

  it('keeps 5 math, 3 English, and 2 physics pages strictly isolated', async () => {
    const counts: Array<[Subject, number]> = [['数学', 5], ['英语', 3], ['物理', 2]];
    for (const [subject, count] of counts) {
      for (let index = count; index >= 1; index -= 1) {
        const response = await jsonRequest(`/api/students/${studentId}/courses`, cookie, 'POST', {
          subject,
          record_date: `2026-08-${String(index).padStart(2, '0')}`,
          course_content: `${subject}第${index}课`,
          feedback: `${subject}反馈 ${index}`,
        });
        expect(response.status).toBe(201);
      }
    }

    for (const [subject, count] of counts) {
      const response = await api(`/api/students/${studentId}/courses?subject=${encodeURIComponent(subject)}`, {
        headers: authedHeaders(cookie),
      });
      const body = await response.json<{ records: CourseRecord[]; total: number }>();
      expect(body.total).toBe(count);
      expect(body.records.every((record) => record.subject === subject)).toBe(true);
      expect(body.records.map((record) => record.record_date)).toEqual(
        Array.from({ length: count }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`),
      );
    }
  });

  it('edits dates and content and deletes a course page', async () => {
    const created = await jsonRequest(`/api/students/${studentId}/courses`, cookie, 'POST', {
      subject: '数学', record_date: '2026-08-10', course_content: '一次函数', feedback: '原反馈',
    });
    const original = (await created.json<{ record: CourseRecord }>()).record;
    const updated = await jsonRequest(`/api/course-records/${original.id}`, cookie, 'PUT', {
      subject: '数学', record_date: '2026-08-08', course_content: '一次函数综合题', feedback: '修改后的反馈',
    });
    const edited = (await updated.json<{ record: CourseRecord }>()).record;
    expect(edited).toMatchObject({ record_date: '2026-08-08', course_content: '一次函数综合题', feedback: '修改后的反馈' });
    expect(edited.created_at).toBe(original.created_at);

    expect((await jsonRequest(`/api/course-records/${original.id}`, cookie, 'DELETE')).status).toBe(204);
    const list = await api(`/api/students/${studentId}/courses?subject=${encodeURIComponent('数学')}`, {
      headers: authedHeaders(cookie),
    });
    expect((await list.json<{ records: CourseRecord[] }>()).records).toEqual([]);
  });

  it('rejects unknown subjects in both queries and writes', async () => {
    const query = await api(`/api/students/${studentId}/courses?subject=${encodeURIComponent('音乐')}`, {
      headers: authedHeaders(cookie),
    });
    expect(query.status).toBe(422);

    const write = await jsonRequest(`/api/students/${studentId}/courses`, cookie, 'POST', {
      subject: '音乐', record_date: '2026-08-08', course_content: '', feedback: '非法科目',
    });
    expect(write.status).toBe(422);
  });
});
