import { beforeEach, describe, expect, it } from 'vitest';
import type { Student, StudentArchive, Tag } from '../../shared/contracts';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('complete student archive API', () => {
  let cookie: string;
  let studentId: number;

  beforeEach(async () => {
    await resetDatabase();
    await setupAdmin();
    cookie = (await login()).cookie;
    const studentResponse = await jsonRequest('/api/students', cookie, 'POST', {
      name: '张三', grade: '初一', school: '实验学校', join_date: '2026-02-10', remark: '',
    });
    studentId = (await studentResponse.json<{ student: Student }>()).student.id;
    const tagResponse = await jsonRequest('/api/tags', cookie, 'POST', { name: '重点关注' });
    const tagId = (await tagResponse.json<{ tag: Tag }>()).tag.id;
    await jsonRequest(`/api/students/${studentId}/tags`, cookie, 'PUT', { tag_ids: [tagId] });
  });

  it('returns a sorted printable archive and omits empty course chapters', async () => {
    await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', {
      exam_name: '期中考试', exam_date: '2026-05-10', chinese: null, math: 82, english: 85, physics: null, chemistry: null, remark: '',
    });
    await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', {
      exam_name: '入学考试', exam_date: '2026-02-10', chinese: null, math: 75, english: 80, physics: null, chemistry: null, remark: '',
    });
    await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
      record_date: '2026-08-11', content: '第二页',
    });
    await jsonRequest(`/api/students/${studentId}/study-records`, cookie, 'POST', {
      record_date: '2026-08-10', content: '第一页',
    });
    for (const subject of ['英语', '数学'] as const) {
      await jsonRequest(`/api/students/${studentId}/courses`, cookie, 'POST', {
        subject, record_date: '2026-08-11', course_content: `${subject}课程`, feedback: `${subject}反馈`,
      });
    }

    const response = await api(`/api/students/${studentId}/archive`, { headers: authedHeaders(cookie) });
    expect(response.status).toBe(200);
    const archive = await response.json<StudentArchive>();
    expect(archive.student).toMatchObject({ name: '张三', school: '实验学校', grade: '初一' });
    expect(archive.student.tags.map((tag) => tag.name)).toEqual(['重点关注']);
    expect(archive.scores.map((score) => score.exam_name)).toEqual(['入学考试', '期中考试']);
    expect(archive.studyRecords.map((record) => record.content)).toEqual(['第一页', '第二页']);
    expect(archive.courseSections.map((section) => section.subject)).toEqual(['数学', '英语']);
    expect(archive.courseSections.some((section) => section.subject === '剑桥')).toBe(false);
  });

  it('does not expose printable student data without a session', async () => {
    expect((await api(`/api/students/${studentId}/archive`)).status).toBe(401);
  });
});
