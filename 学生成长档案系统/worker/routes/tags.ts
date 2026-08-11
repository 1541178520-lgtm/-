import { Hono } from 'hono';
import type { Tag } from '../../shared/contracts';
import { tagInputSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const tags = new Hono<AppEnv>();

async function ensureUnique(db: D1Database, name: string, excludedId?: number): Promise<void> {
  const existing = excludedId
    ? await db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE AND id != ?').bind(name, excludedId).first()
    : await db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').bind(name).first();
  if (existing) throw new ApiException(409, 'TAG_NAME_EXISTS', '标签名称已经存在', { name: '标签名称已经存在' });
}

async function getTag(db: D1Database, id: number): Promise<Tag> {
  const tag = await db.prepare(
    'SELECT id, name, created_at, updated_at FROM tags WHERE id = ?',
  ).bind(id).first<Tag>();
  if (!tag) throw new ApiException(404, 'TAG_NOT_FOUND', '标签不存在');
  return tag;
}

tags.get('/tags', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, name, created_at, updated_at FROM tags ORDER BY name COLLATE NOCASE, id',
  ).all<Tag>();
  return c.json({ tags: result.results });
});

tags.post('/tags', async (c) => {
  const input = await parseJson(c, tagInputSchema);
  await ensureUnique(c.env.DB, input.name);
  const result = await c.env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(input.name).run();
  return c.json({ tag: await getTag(c.env.DB, Number(result.meta.last_row_id)) }, 201);
});

tags.put('/tags/:id', async (c) => {
  const id = parseId(c.req.param('id'), '标签');
  await getTag(c.env.DB, id);
  const input = await parseJson(c, tagInputSchema);
  await ensureUnique(c.env.DB, input.name, id);
  await c.env.DB.prepare('UPDATE tags SET name = ?, updated_at = ? WHERE id = ?').bind(input.name, nowIso(), id).run();
  return c.json({ tag: await getTag(c.env.DB, id) });
});

tags.delete('/tags/:id', async (c) => {
  const id = parseId(c.req.param('id'), '标签');
  await getTag(c.env.DB, id);
  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM student_tags WHERE tag_id = ?',
  ).bind(id).first<{ count: number }>();
  await c.env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
  return c.json({ deleted: true, affectedStudents: count?.count ?? 0 });
});

export default tags;
