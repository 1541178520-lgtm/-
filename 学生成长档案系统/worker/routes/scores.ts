import { Hono } from 'hono';
import type { Score, ScoreSubject, ScoreValue } from '../../shared/contracts';
import { scoreInputSchema, scoreSubjectInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const scores = new Hono<AppEnv>();

const SCORE_COLUMNS = `id, student_id, exam_name, exam_date, chinese, math, english,
  physics, chemistry, remark, created_at, updated_at`;

async function hydrateScoreValues(db: D1Database, records: Score[]): Promise<Score[]> {
  if (records.length === 0) return records;
  const placeholders = records.map(() => '?').join(',');
  const result = await db.prepare(
    `SELECT score_values.score_id, score_values.subject_id, score_subjects.name AS subject_name, score_values.value
     FROM score_values JOIN score_subjects ON score_subjects.id = score_values.subject_id
     WHERE score_values.score_id IN (${placeholders})
     ORDER BY score_subjects.is_default DESC, score_subjects.id`,
  ).bind(...records.map((record) => record.id)).all<ScoreValue & { score_id: number }>();
  const byScore = new Map<number, ScoreValue[]>();
  for (const value of result.results) {
    const values = byScore.get(value.score_id) ?? [];
    values.push({ subject_id: value.subject_id, subject_name: value.subject_name, value: value.value });
    byScore.set(value.score_id, values);
  }
  return records.map((record) => ({ ...record, values: byScore.get(record.id) ?? [] }));
}

export async function listScores(db: D1Database, studentId: number): Promise<Score[]> {
  const result = await db.prepare(
    `SELECT ${SCORE_COLUMNS} FROM scores WHERE student_id = ? ORDER BY exam_date, created_at, id`,
  ).bind(studentId).all<Score>();
  return hydrateScoreValues(db, result.results);
}

async function getScore(db: D1Database, id: number): Promise<Score> {
  const score = await db.prepare(`SELECT ${SCORE_COLUMNS} FROM scores WHERE id = ?`).bind(id).first<Score>();
  if (!score) throw new ApiException(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
  return (await hydrateScoreValues(db, [score]))[0];
}

async function normalizeValues(db: D1Database, input: ReturnType<typeof scoreInputSchema.parse>): Promise<Array<{ subject_id: number; value: number }>> {
  if (input.values) {
    const unique = new Map(input.values.map((value) => [value.subject_id, value]));
    const ids = [...unique.keys()];
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const existing = await db.prepare(`SELECT id FROM score_subjects WHERE id IN (${placeholders})`).bind(...ids).all<{ id: number }>();
      if (existing.results.length !== ids.length) throw new ApiException(422, 'INVALID_SCORE_SUBJECT', '成绩科目无效', { values: '包含不存在的科目' });
    }
    return [...unique.values()];
  }
  const legacy = [
    ['语文', input.chinese], ['数学', input.math], ['英语', input.english], ['物理', input.physics], ['化学', input.chemistry],
  ] as const;
  const defaults = await db.prepare('SELECT id, name FROM score_subjects WHERE is_default = 1 ORDER BY id').all<{ id: number; name: string }>();
  const ids = new Map(defaults.results.map((subject) => [subject.name, subject.id]));
  return legacy.flatMap(([name, value]) => value === null ? [] : [{ subject_id: ids.get(name)!, value }]);
}

async function replaceValues(db: D1Database, scoreId: number, values: Array<{ subject_id: number; value: number }>) {
  await db.batch([
    db.prepare('DELETE FROM score_values WHERE score_id = ?').bind(scoreId),
    ...values.map((value) => db.prepare('INSERT INTO score_values (score_id, subject_id, value) VALUES (?, ?, ?)').bind(scoreId, value.subject_id, value.value)),
  ]);
}

scores.get('/score-subjects', async (c) => {
  const result = await c.env.DB.prepare('SELECT id, name, is_default, created_at FROM score_subjects ORDER BY is_default DESC, id').all<ScoreSubject>();
  return c.json({ subjects: result.results });
});

scores.post('/score-subjects', async (c) => {
  const input = await parseJson(c, scoreSubjectInputSchema);
  try {
    const result = await c.env.DB.prepare('INSERT INTO score_subjects (name) VALUES (?)').bind(input.name).run();
    const subject = await c.env.DB.prepare('SELECT id, name, is_default, created_at FROM score_subjects WHERE id = ?').bind(result.meta.last_row_id).first<ScoreSubject>();
    return c.json({ subject }, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) throw new ApiException(409, 'SCORE_SUBJECT_EXISTS', '科目已经存在', { name: '科目已经存在' });
    throw error;
  }
});

scores.get('/students/:studentId/scores', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  return c.json({ scores: await listScores(c.env.DB, studentId) });
});

scores.post('/students/:studentId/scores', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const input = await parseJson(c, scoreInputSchema);
  const values = await normalizeValues(c.env.DB, input);
  const result = await c.env.DB.prepare(
    `INSERT INTO scores (student_id, exam_name, exam_date, chinese, math, english, physics, chemistry, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(studentId, input.exam_name, input.exam_date, input.chinese, input.math, input.english, input.physics, input.chemistry, input.remark).run();
  const id = Number(result.meta.last_row_id);
  await replaceValues(c.env.DB, id, values);
  return c.json({ score: await getScore(c.env.DB, id) }, 201);
});

scores.put('/scores/:id', async (c) => {
  const id = parseId(c.req.param('id'), '成绩记录');
  await getScore(c.env.DB, id);
  const input = await parseJson(c, scoreInputSchema);
  const values = await normalizeValues(c.env.DB, input);
  await c.env.DB.prepare(
    `UPDATE scores SET exam_name = ?, exam_date = ?, chinese = ?, math = ?, english = ?, physics = ?, chemistry = ?, remark = ?, updated_at = ? WHERE id = ?`,
  ).bind(input.exam_name, input.exam_date, input.chinese, input.math, input.english, input.physics, input.chemistry, input.remark, nowIso(), id).run();
  await replaceValues(c.env.DB, id, values);
  return c.json({ score: await getScore(c.env.DB, id) });
});

scores.delete('/scores/:id', async (c) => {
  const id = parseId(c.req.param('id'), '成绩记录');
  const result = await c.env.DB.prepare('DELETE FROM scores WHERE id = ?').bind(id).run();
  if (result.meta.changes === 0) throw new ApiException(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
  return c.body(null, 204);
});

export default scores;
