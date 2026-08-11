import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '../../shared/constants';

describe('D1 archive schema', () => {
  it('creates every required archive table', async () => {
    const result = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>();
    const names = result.results.map((row) => row.name);

    expect(names).toEqual(expect.arrayContaining([
      'admins',
      'sessions',
      'students',
      'tags',
      'student_tags',
      'scores',
      'study_records',
      'course_records',
    ]));
  });

  it('defines exactly the seven V1 course subjects', () => {
    expect(SUBJECTS).toEqual(['语文', '数学', '英语', '物理', '化学', '自然拼读', '剑桥']);
  });

  it('cascades student-owned records and rejects unknown course subjects', async () => {
    const student = await env.DB.prepare(
      "INSERT INTO students (name, grade) VALUES ('张三', '初一') RETURNING id",
    ).first<{ id: number }>();
    const tag = await env.DB.prepare("INSERT INTO tags (name) VALUES ('重点关注') RETURNING id").first<{ id: number }>();

    await env.DB.batch([
      env.DB.prepare('INSERT INTO student_tags (student_id, tag_id) VALUES (?, ?)').bind(student!.id, tag!.id),
      env.DB.prepare("INSERT INTO scores (student_id, exam_name, exam_date, math) VALUES (?, '入学考试', '2026-02-10', 75)").bind(student!.id),
      env.DB.prepare("INSERT INTO study_records (student_id, record_date, content) VALUES (?, '2026-08-08', '晚辅反馈')").bind(student!.id),
      env.DB.prepare("INSERT INTO course_records (student_id, subject, record_date, feedback) VALUES (?, '数学', '2026-08-09', '课程反馈')").bind(student!.id),
    ]);

    await expect(
      env.DB.prepare("INSERT INTO course_records (student_id, subject, record_date, feedback) VALUES (?, '音乐', '2026-08-09', '非法科目')")
        .bind(student!.id)
        .run(),
    ).rejects.toThrow();

    await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(student!.id).run();
    for (const table of ['student_tags', 'scores', 'study_records', 'course_records']) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first<{ count: number }>();
      expect(row?.count).toBe(0);
    }
  });
});
