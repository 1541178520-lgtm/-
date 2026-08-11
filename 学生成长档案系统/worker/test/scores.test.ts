import { beforeEach, describe, expect, it } from 'vitest';
import type { Score, Student } from '../../shared/contracts';
import { api, authedHeaders, jsonRequest, login, resetDatabase, setupAdmin } from './helpers';

describe('score API', () => {
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

  it('stores nullable subject values and orders three exams by exam date', async () => {
    const inputs = [
      { exam_name: '期末考试', exam_date: '2026-07-05', chinese: null, math: 88, english: 91, physics: null, chemistry: null, remark: '' },
      { exam_name: '入学考试', exam_date: '2026-02-10', chinese: null, math: 75, english: 82, physics: null, chemistry: null, remark: '数学基础较弱' },
      { exam_name: '期中考试', exam_date: '2026-04-20', chinese: 0, math: 82, english: null, physics: 70, chemistry: null, remark: '' },
    ];
    for (const input of inputs) {
      expect((await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', input)).status).toBe(201);
    }

    const response = await api(`/api/students/${studentId}/scores`, { headers: authedHeaders(cookie) });
    const scores = (await response.json<{ scores: Score[] }>()).scores;
    expect(scores.map((score) => score.exam_name)).toEqual(['入学考试', '期中考试', '期末考试']);
    expect(scores[0]).toMatchObject({ math: 75, physics: null, chemistry: null });
    expect(scores[1].chinese).toBe(0);
  });

  it('edits and deletes a score without changing its creation timestamp', async () => {
    const created = await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', {
      exam_name: '入学考试', exam_date: '2026-02-10', chinese: null, math: 75, english: 82, physics: null, chemistry: null, remark: '',
    });
    const original = (await created.json<{ score: Score }>()).score;

    const updated = await jsonRequest(`/api/scores/${original.id}`, cookie, 'PUT', {
      exam_name: '春季入学考试', exam_date: '2026-02-11', chinese: 80, math: 77.5, english: 85, physics: null, chemistry: null, remark: '已复核',
    });
    const edited = (await updated.json<{ score: Score }>()).score;
    expect(edited).toMatchObject({ exam_name: '春季入学考试', exam_date: '2026-02-11', math: 77.5, remark: '已复核' });
    expect(edited.created_at).toBe(original.created_at);

    expect((await jsonRequest(`/api/scores/${original.id}`, cookie, 'DELETE')).status).toBe(204);
    const list = await api(`/api/students/${studentId}/scores`, { headers: authedHeaders(cookie) });
    expect((await list.json<{ scores: Score[] }>()).scores).toEqual([]);
  });

  it('rejects invalid dates, out-of-range scores, and unknown students', async () => {
    const invalid = await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', {
      exam_name: '错误考试', exam_date: '2026-02-31', chinese: 151, math: -1, english: null, physics: null, chemistry: null, remark: '',
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({
      error: { fields: { exam_date: expect.any(String), chinese: expect.any(String), math: expect.any(String) } },
    });

    const missing = await jsonRequest('/api/students/999/scores', cookie, 'POST', {
      exam_name: '入学考试', exam_date: '2026-02-10', chinese: null, math: 75, english: null, physics: null, chemistry: null, remark: '',
    });
    expect(missing.status).toBe(404);
  });

  it('keeps score collections isolated by student', async () => {
    const otherResponse = await jsonRequest('/api/students', cookie, 'POST', {
      name: '李四', grade: '初二', school: '', join_date: null, remark: '',
    });
    const otherId = (await otherResponse.json<{ student: Student }>()).student.id;
    await jsonRequest(`/api/students/${studentId}/scores`, cookie, 'POST', {
      exam_name: '张三考试', exam_date: '2026-02-10', chinese: null, math: 75, english: null, physics: null, chemistry: null, remark: '',
    });

    const otherScores = await api(`/api/students/${otherId}/scores`, { headers: authedHeaders(cookie) });
    expect((await otherScores.json<{ scores: Score[] }>()).scores).toEqual([]);
  });
});
