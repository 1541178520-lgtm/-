import { Hono } from 'hono';
import { studentInputSchema, studentTagsInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, listStudents, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const students = new Hono<AppEnv>();

students.get('/students', async (c) => {
  return c.json({ students: await listStudents(c.env.DB, c.req.query('search') ?? '') });
});

students.post('/students', async (c) => {
  const input = await parseJson(c, studentInputSchema);
  const result = await c.env.DB.prepare(
    `INSERT INTO students (name, grade, school, join_date, remark)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(input.name, input.grade, input.school, input.join_date, input.remark).run();
  return c.json({ student: await getStudent(c.env.DB, Number(result.meta.last_row_id)) }, 201);
});

students.get('/students/:id', async (c) => {
  return c.json({ student: await getStudent(c.env.DB, parseId(c.req.param('id'), '学生')) });
});

students.put('/students/:id', async (c) => {
  const id = parseId(c.req.param('id'), '学生');
  await getStudent(c.env.DB, id);
  const input = await parseJson(c, studentInputSchema);
  await c.env.DB.prepare(
    `UPDATE students SET name = ?, grade = ?, school = ?, join_date = ?, remark = ?, updated_at = ?
     WHERE id = ?`,
  ).bind(input.name, input.grade, input.school, input.join_date, input.remark, nowIso(), id).run();
  return c.json({ student: await getStudent(c.env.DB, id) });
});

students.delete('/students/:id', async (c) => {
  const id = parseId(c.req.param('id'), '学生');
  const result = await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
  if (result.meta.changes === 0) throw new ApiException(404, 'STUDENT_NOT_FOUND', '学生不存在');
  return c.body(null, 204);
});

students.put('/students/:id/tags', async (c) => {
  const studentId = parseId(c.req.param('id'), '学生');
  await getStudent(c.env.DB, studentId);
  const input = await parseJson(c, studentTagsInputSchema);
  const tagIds = [...new Set(input.tag_ids)];
  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',');
    const found = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM tags WHERE id IN (${placeholders})`)
      .bind(...tagIds)
      .first<{ count: number }>();
    if (found?.count !== tagIds.length) {
      throw new ApiException(422, 'INVALID_TAGS', '选择的标签中有已不存在的项目', { tag_ids: '请重新选择标签' });
    }
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM student_tags WHERE student_id = ?').bind(studentId),
    ...tagIds.map((tagId) => c.env.DB.prepare(
      'INSERT INTO student_tags (student_id, tag_id) VALUES (?, ?)',
    ).bind(studentId, tagId)),
  ]);
  return c.json({ student: await getStudent(c.env.DB, studentId) });
});

export default students;
