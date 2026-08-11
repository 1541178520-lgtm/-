import { Hono } from 'hono';
import type { Score } from '../../shared/contracts';
import { scoreInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const scores = new Hono<AppEnv>();

const SCORE_COLUMNS = `id, student_id, exam_name, exam_date, chinese, math, english,
  physics, chemistry, remark, created_at, updated_at`;

async function getScore(db: D1Database, id: number): Promise<Score> {
  const score = await db.prepare(`SELECT ${SCORE_COLUMNS} FROM scores WHERE id = ?`).bind(id).first<Score>();
  if (!score) throw new ApiException(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
  return score;
}

scores.get('/students/:studentId/scores', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const result = await c.env.DB.prepare(
    `SELECT ${SCORE_COLUMNS} FROM scores
     WHERE student_id = ? ORDER BY exam_date, created_at, id`,
  ).bind(studentId).all<Score>();
  return c.json({ scores: result.results });
});

scores.post('/students/:studentId/scores', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const input = await parseJson(c, scoreInputSchema);
  const result = await c.env.DB.prepare(
    `INSERT INTO scores (
      student_id, exam_name, exam_date, chinese, math, english, physics, chemistry, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    studentId,
    input.exam_name,
    input.exam_date,
    input.chinese,
    input.math,
    input.english,
    input.physics,
    input.chemistry,
    input.remark,
  ).run();
  return c.json({ score: await getScore(c.env.DB, Number(result.meta.last_row_id)) }, 201);
});

scores.put('/scores/:id', async (c) => {
  const id = parseId(c.req.param('id'), '成绩记录');
  await getScore(c.env.DB, id);
  const input = await parseJson(c, scoreInputSchema);
  await c.env.DB.prepare(
    `UPDATE scores SET exam_name = ?, exam_date = ?, chinese = ?, math = ?, english = ?,
      physics = ?, chemistry = ?, remark = ?, updated_at = ? WHERE id = ?`,
  ).bind(
    input.exam_name,
    input.exam_date,
    input.chinese,
    input.math,
    input.english,
    input.physics,
    input.chemistry,
    input.remark,
    nowIso(),
    id,
  ).run();
  return c.json({ score: await getScore(c.env.DB, id) });
});

scores.delete('/scores/:id', async (c) => {
  const id = parseId(c.req.param('id'), '成绩记录');
  const result = await c.env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run();
  if (result.meta.changes === 0) throw new ApiException(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
  return c.body(null, 204);
});

export default scores;
