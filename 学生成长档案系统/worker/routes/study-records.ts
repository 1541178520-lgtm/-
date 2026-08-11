import { Hono } from 'hono';
import type { StudyRecord } from '../../shared/contracts';
import { studyRecordInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const studyRecords = new Hono<AppEnv>();
const COLUMNS = 'id, student_id, record_date, content, created_at, updated_at';

async function getRecord(db: D1Database, id: number): Promise<StudyRecord> {
  const record = await db.prepare(`SELECT ${COLUMNS} FROM study_records WHERE id = ?`).bind(id).first<StudyRecord>();
  if (!record) throw new ApiException(404, 'STUDY_RECORD_NOT_FOUND', '晚辅记录不存在');
  return record;
}

studyRecords.get('/students/:studentId/study-records', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const result = await c.env.DB.prepare(
    `SELECT ${COLUMNS} FROM study_records
     WHERE student_id = ? ORDER BY record_date, created_at, id`,
  ).bind(studentId).all<StudyRecord>();
  return c.json({ records: result.results, total: result.results.length });
});

studyRecords.post('/students/:studentId/study-records', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const input = await parseJson(c, studyRecordInputSchema);
  const result = await c.env.DB.prepare(
    'INSERT INTO study_records (student_id, record_date, content) VALUES (?, ?, ?)',
  ).bind(studentId, input.record_date, input.content).run();
  return c.json({ record: await getRecord(c.env.DB, Number(result.meta.last_row_id)) }, 201);
});

studyRecords.put('/study-records/:id', async (c) => {
  const id = parseId(c.req.param('id'), '晚辅记录');
  await getRecord(c.env.DB, id);
  const input = await parseJson(c, studyRecordInputSchema);
  await c.env.DB.prepare(
    'UPDATE study_records SET record_date = ?, content = ?, updated_at = ? WHERE id = ?',
  ).bind(input.record_date, input.content, nowIso(), id).run();
  return c.json({ record: await getRecord(c.env.DB, id) });
});

studyRecords.delete('/study-records/:id', async (c) => {
  const id = parseId(c.req.param('id'), '晚辅记录');
  const result = await c.env.DB.prepare('DELETE FROM study_records WHERE id = ?').bind(id).run();
  if (result.meta.changes === 0) throw new ApiException(404, 'STUDY_RECORD_NOT_FOUND', '晚辅记录不存在');
  return c.body(null, 204);
});

export default studyRecords;
