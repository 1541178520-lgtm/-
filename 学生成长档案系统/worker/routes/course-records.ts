import { Hono } from 'hono';
import type { CourseRecord } from '../../shared/contracts';
import { SUBJECTS, type Subject } from '../../shared/constants';
import { courseRecordInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const courseRecords = new Hono<AppEnv>();
const COLUMNS = 'id, student_id, subject, record_date, course_content, feedback, created_at, updated_at';

function parseSubject(value: string | undefined): Subject {
  if (!value || !SUBJECTS.includes(value as Subject)) {
    throw new ApiException(422, 'INVALID_SUBJECT', '课程科目无效', { subject: '请选择固定课程科目' });
  }
  return value as Subject;
}

async function getRecord(db: D1Database, id: number): Promise<CourseRecord> {
  const record = await db.prepare(`SELECT ${COLUMNS} FROM course_records WHERE id = ?`).bind(id).first<CourseRecord>();
  if (!record) throw new ApiException(404, 'COURSE_RECORD_NOT_FOUND', '课程记录不存在');
  return record;
}

courseRecords.get('/students/:studentId/courses', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const subject = parseSubject(c.req.query('subject'));
  const result = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM course_records
     WHERE student_id = ? AND subject = ? ORDER BY record_date, created_at, id`,
  ).bind(studentId, subject).all<CourseRecord>();
  return c.json({ records: result.results, total: result.results.length });
});

courseRecords.post('/students/:studentId/courses', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const input = await parseJson(c, courseRecordInputSchema);
  const result = await c.env.DB.prepare(
    `INSERT INTO course_records (student_id, subject, record_date, course_content, feedback)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(studentId, input.subject, input.record_date, input.course_content, input.feedback).run();
  return c.json({ record: await getRecord(c.env.DB, Number(result.meta.last_row_id)) }, 201);
});

courseRecords.put('/course-records/:id', async (c) => {
  const id = parseId(c.req.param('id'), '课程记录');
  await getRecord(c.env.DB, id);
  const input = await parseJson(c, courseRecordInputSchema);
  await c.env.DB.prepare(
    `UPDATE course_records SET subject = ?, record_date = ?, course_content = ?, feedback = ?, updated_at = ?
     WHERE id = ?`,
  ).bind(input.subject, input.record_date, input.course_content, input.feedback, nowIso(), id).run();
  return c.json({ record: await getRecord(c.env.DB, id) });
});

courseRecords.delete('/course-records/:id', async (c) => {
  const id = parseId(c.req.param('id'), '课程记录');
  const result = await c.env.DB.prepare('DELETE FROM course_records WHERE id = ?').bind(id).run();
  if (result.meta.changes === 0) throw new ApiException(404, 'COURSE_RECORD_NOT_FOUND', '课程记录不存在');
  return c.body(null, 204);
});

export default courseRecords;
