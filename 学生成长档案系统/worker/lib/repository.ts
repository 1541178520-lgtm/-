import type { Student, Tag } from '../../shared/contracts';
import { ApiException } from './http';

type StudentRow = Omit<Student, 'tags'>;

export function parseId(value: string, label = '资源'): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiException(404, 'NOT_FOUND', `${label}不存在`);
  return id;
}

export function nowIso(): string {
  return new Date().toISOString();
}

async function tagsByStudent(db: D1Database, studentIds: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  for (const id of studentIds) map.set(id, []);
  if (studentIds.length === 0) return map;

  const placeholders = studentIds.map(() => '?').join(',');
  const result = await db.prepare(
    `SELECT st.student_id, t.id, t.name, t.created_at, t.updated_at
     FROM student_tags st JOIN tags t ON t.id = st.tag_id
     WHERE st.student_id IN (${placeholders})
     ORDER BY t.name COLLATE NOCASE, t.id`,
  ).bind(...studentIds).all<Tag & { student_id: number }>();
  for (const row of result.results) {
    const { student_id, ...tag } = row;
    map.get(student_id)?.push(tag);
  }
  return map;
}

export async function listStudents(db: D1Database, search = ''): Promise<Student[]> {
  const trimmedSearch = search.trim();
  const escaped = trimmedSearch.replace(/[\\%_]/gu, (character) => `\\${character}`);
  const statement = trimmedSearch
    ? db.prepare(
      `SELECT id, name, grade, school, join_date, remark, created_at, updated_at
       FROM students WHERE name LIKE ? ESCAPE '\\'
       ORDER BY grade COLLATE NOCASE, name COLLATE NOCASE, id`,
    ).bind(`%${escaped}%`)
    : db.prepare(
      `SELECT id, name, grade, school, join_date, remark, created_at, updated_at
       FROM students ORDER BY grade COLLATE NOCASE, name COLLATE NOCASE, id`,
    );
  const result = await statement.all<StudentRow>();
  const tagMap = await tagsByStudent(db, result.results.map((student) => student.id));
  return result.results.map((student) => ({ ...student, tags: tagMap.get(student.id) ?? [] }));
}

export async function getStudent(db: D1Database, id: number): Promise<Student> {
  const student = await db.prepare(
    `SELECT id, name, grade, school, join_date, remark, created_at, updated_at
     FROM students WHERE id = ?`,
  ).bind(id).first<StudentRow>();
  if (!student) throw new ApiException(404, 'STUDENT_NOT_FOUND', '学生不存在');
  const tagMap = await tagsByStudent(db, [id]);
  return { ...student, tags: tagMap.get(id) ?? [] };
}
