import type { CourseRecord, Score, ScoreSubject, ScoreValue, Student, StudentArchive, Tag } from '../shared/contracts.js';
import { SUBJECTS, type Subject } from '../shared/constants.js';
import {
  courseRecordInputSchema,
  loginInputSchema,
  scoreInputSchema,
  scoreSubjectInputSchema,
  studentInputSchema,
  studentTagsInputSchema,
  studyRecordInputSchema,
  tagInputSchema,
} from '../shared/validation.js';
import { LocalStore, now, type LocalData } from './localStore.js';
import type { DesktopApiFailure, DesktopApiResponse, DesktopRequestInit } from './types.js';

interface SafeParser<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}

class LocalApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const ok = (body?: unknown, status = 200): DesktopApiResponse => ({ ok: true, status, body });
const fail = (error: LocalApiError): DesktopApiFailure => ({
  ok: false,
  status: error.status,
  body: { error: { code: error.code, message: error.message, fields: error.fields } },
});

function parseId(value: string | undefined, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new LocalApiError(404, 'NOT_FOUND', `${label}不存在`);
  return id;
}

function parseBody<T>(init: DesktopRequestInit, schema: SafeParser<T>): T {
  let value: unknown = {};
  if (init.body) value = JSON.parse(init.body);
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const fields: Record<string, string> = {};
  for (const issue of parsed.error.issues) fields[String(issue.path.join('.'))] = issue.message;
  throw new LocalApiError(422, 'VALIDATION_FAILED', '请检查填写内容', fields);
}

function publicStudent(data: LocalData, student: LocalData['students'][number]): Student {
  return {
    ...student,
    tags: student.tagIds
      .map((tagId) => data.tags.find((tag) => tag.id === tagId))
      .filter((tag): tag is Tag => Boolean(tag)),
  };
}

function findStudent(data: LocalData, id: number): LocalData['students'][number] {
  const student = data.students.find((item) => item.id === id);
  if (!student) throw new LocalApiError(404, 'STUDENT_NOT_FOUND', '学生不存在');
  return student;
}

function findScore(data: LocalData, id: number): Score {
  const score = data.scores.find((item) => item.id === id);
  if (!score) throw new LocalApiError(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
  return score;
}

function findStudyRecord(data: LocalData, id: number) {
  const record = data.studyRecords.find((item) => item.id === id);
  if (!record) throw new LocalApiError(404, 'STUDY_RECORD_NOT_FOUND', '晚辅记录不存在');
  return record;
}

function findCourseRecord(data: LocalData, id: number) {
  const record = data.courseRecords.find((item) => item.id === id);
  if (!record) throw new LocalApiError(404, 'COURSE_RECORD_NOT_FOUND', '课程记录不存在');
  return record;
}

function hydrateScore(data: LocalData, score: Score): Score {
  const values = score.values
    .map((value) => {
      const subject = data.scoreSubjects.find((item) => item.id === value.subject_id);
      return subject ? { ...value, subject_name: subject.name } : null;
    })
    .filter((value): value is ScoreValue => Boolean(value));
  return { ...score, values };
}

function normalizeScoreValues(data: LocalData, input: ReturnType<typeof scoreInputSchema.parse>): ScoreValue[] {
  return (input.values ?? []).map((value) => {
    const subject = data.scoreSubjects.find((item) => item.id === value.subject_id);
    if (!subject) throw new LocalApiError(422, 'INVALID_SCORE_SUBJECT', '成绩科目无效', { values: '包含不存在的科目' });
    return { subject_id: subject.id, subject_name: subject.name, value: value.value };
  });
}

function parseSubject(value: string | null): Subject {
  if (!value || !SUBJECTS.includes(value as Subject)) {
    throw new LocalApiError(422, 'INVALID_SUBJECT', '课程科目无效', { subject: '请选择固定课程科目' });
  }
  return value as Subject;
}

export function createLocalApi(dataPath: string) {
  const store = new LocalStore(dataPath);
  let signedIn = false;

  async function handle(path: string, init: DesktopRequestInit = {}): Promise<DesktopApiResponse> {
    try {
      const method = (init.method ?? 'GET').toUpperCase();
      const url = new URL(path, 'app://local');
      const parts = url.pathname.split('/').filter(Boolean);

      if (url.pathname === '/auth/me' && method === 'GET') {
        if (!signedIn) throw new LocalApiError(401, 'UNAUTHENTICATED', '请先登录');
        return ok({ admin: { id: 1, username: 'archive-admin' } });
      }
      if (url.pathname === '/auth/login' && method === 'POST') {
        const input = parseBody(init, loginInputSchema);
        if (input.username !== 'archive-admin' || input.password !== 'archive-admin') {
          throw new LocalApiError(401, 'INVALID_CREDENTIALS', '账号或密码错误');
        }
        signedIn = true;
        return ok({ admin: { id: 1, username: 'archive-admin' } });
      }
      if (url.pathname === '/auth/logout' && method === 'POST') {
        signedIn = false;
        return ok();
      }
      if (!signedIn) throw new LocalApiError(401, 'UNAUTHENTICATED', '请先登录');

      if (url.pathname === '/students' && method === 'GET') {
        const search = (url.searchParams.get('search') ?? '').trim().toLocaleLowerCase();
        const data = await store.read();
        const students = data.students
          .filter((student) => !search || student.name.toLocaleLowerCase().includes(search))
          .sort((a, b) => a.grade.localeCompare(b.grade, 'zh-Hans-CN') || a.name.localeCompare(b.name, 'zh-Hans-CN') || a.id - b.id)
          .map((student) => publicStudent(data, student));
        return ok({ students });
      }

      if (url.pathname === '/students' && method === 'POST') {
        const input = parseBody(init, studentInputSchema);
        return ok({ student: await store.update((data) => {
          const created_at = now();
          const student = { id: data.nextIds.student++, ...input, tagIds: [], created_at, updated_at: created_at };
          data.students.push(student);
          return publicStudent(data, student);
        }) }, 201);
      }

      if (parts[0] === 'students' && parts.length === 2 && method === 'GET') {
        const id = parseId(parts[1], '学生');
        const data = await store.read();
        return ok({ student: publicStudent(data, findStudent(data, id)) });
      }

      if (parts[0] === 'students' && parts.length === 2 && method === 'PUT') {
        const id = parseId(parts[1], '学生');
        const input = parseBody(init, studentInputSchema);
        return ok({ student: await store.update((data) => {
          const student = findStudent(data, id);
          Object.assign(student, input, { updated_at: now() });
          return publicStudent(data, student);
        }) });
      }

      if (parts[0] === 'students' && parts.length === 2 && method === 'DELETE') {
        const id = parseId(parts[1], '学生');
        await store.update((data) => {
          const index = data.students.findIndex((item) => item.id === id);
          if (index < 0) throw new LocalApiError(404, 'STUDENT_NOT_FOUND', '学生不存在');
          data.students.splice(index, 1);
          data.scores = data.scores.filter((item) => item.student_id !== id);
          data.studyRecords = data.studyRecords.filter((item) => item.student_id !== id);
          data.courseRecords = data.courseRecords.filter((item) => item.student_id !== id);
        });
        return ok(undefined, 204);
      }

      if (parts[0] === 'students' && parts[2] === 'tags' && method === 'PUT') {
        const studentId = parseId(parts[1], '学生');
        const input = parseBody(init, studentTagsInputSchema);
        return ok({ student: await store.update((data) => {
          const student = findStudent(data, studentId);
          const ids = [...new Set(input.tag_ids)];
          if (ids.some((tagId) => !data.tags.some((tag) => tag.id === tagId))) {
            throw new LocalApiError(422, 'INVALID_TAGS', '选择的标签中有已不存在的项目', { tag_ids: '请重新选择标签' });
          }
          student.tagIds = ids;
          student.updated_at = now();
          return publicStudent(data, student);
        }) });
      }

      if (url.pathname === '/tags' && method === 'GET') {
        const data = await store.read();
        return ok({ tags: [...data.tags].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN') || a.id - b.id) });
      }

      if (url.pathname === '/tags' && method === 'POST') {
        const input = parseBody(init, tagInputSchema);
        return ok({ tag: await store.update((data) => {
          if (data.tags.some((tag) => tag.name.toLocaleLowerCase() === input.name.toLocaleLowerCase())) {
            throw new LocalApiError(409, 'TAG_NAME_EXISTS', '标签名称已经存在', { name: '标签名称已经存在' });
          }
          const created_at = now();
          const tag = { id: data.nextIds.tag++, name: input.name, created_at, updated_at: created_at };
          data.tags.push(tag);
          return tag;
        }) }, 201);
      }

      if (parts[0] === 'tags' && parts.length === 2 && method === 'PUT') {
        const id = parseId(parts[1], '标签');
        const input = parseBody(init, tagInputSchema);
        return ok({ tag: await store.update((data) => {
          const tag = data.tags.find((item) => item.id === id);
          if (!tag) throw new LocalApiError(404, 'TAG_NOT_FOUND', '标签不存在');
          if (data.tags.some((item) => item.id !== id && item.name.toLocaleLowerCase() === input.name.toLocaleLowerCase())) {
            throw new LocalApiError(409, 'TAG_NAME_EXISTS', '标签名称已经存在', { name: '标签名称已经存在' });
          }
          tag.name = input.name;
          tag.updated_at = now();
          return tag;
        }) });
      }

      if (parts[0] === 'tags' && parts.length === 2 && method === 'DELETE') {
        const id = parseId(parts[1], '标签');
        return ok(await store.update((data) => {
          const index = data.tags.findIndex((tag) => tag.id === id);
          if (index < 0) throw new LocalApiError(404, 'TAG_NOT_FOUND', '标签不存在');
          const affectedStudents = data.students.filter((student) => student.tagIds.includes(id)).length;
          data.tags.splice(index, 1);
          for (const student of data.students) student.tagIds = student.tagIds.filter((tagId) => tagId !== id);
          return { deleted: true, affectedStudents };
        }));
      }

      if (url.pathname === '/score-subjects' && method === 'GET') {
        const data = await store.read();
        return ok({ subjects: [...data.scoreSubjects].sort((a, b) => b.is_default - a.is_default || a.id - b.id) });
      }

      if (url.pathname === '/score-subjects' && method === 'POST') {
        const input = parseBody(init, scoreSubjectInputSchema);
        return ok({ subject: await store.update((data) => {
          if (data.scoreSubjects.some((subject) => subject.name.toLocaleLowerCase() === input.name.toLocaleLowerCase())) {
            throw new LocalApiError(409, 'SCORE_SUBJECT_EXISTS', '科目已经存在', { name: '科目已经存在' });
          }
          const subject: ScoreSubject = { id: data.nextIds.scoreSubject++, name: input.name, is_default: 0, created_at: now() };
          data.scoreSubjects.push(subject);
          return subject;
        }) }, 201);
      }

      if (parts[0] === 'students' && parts[2] === 'scores' && method === 'GET') {
        const studentId = parseId(parts[1], '学生');
        const data = await store.read();
        findStudent(data, studentId);
        const scores = data.scores.filter((score) => score.student_id === studentId)
          .sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.id - b.id)
          .map((score) => hydrateScore(data, score));
        return ok({ scores });
      }

      if (parts[0] === 'students' && parts[2] === 'scores' && method === 'POST') {
        const studentId = parseId(parts[1], '学生');
        const input = parseBody(init, scoreInputSchema);
        return ok({ score: await store.update((data) => {
          findStudent(data, studentId);
          const created_at = now();
          const score: Score = {
            id: data.nextIds.score++,
            student_id: studentId,
            exam_name: input.exam_name,
            exam_date: input.exam_date,
            chinese: input.chinese ?? null,
            math: input.math ?? null,
            english: input.english ?? null,
            physics: input.physics ?? null,
            chemistry: input.chemistry ?? null,
            remark: input.remark,
            created_at,
            updated_at: created_at,
            values: normalizeScoreValues(data, input),
          };
          data.scores.push(score);
          return hydrateScore(data, score);
        }) }, 201);
      }

      if (parts[0] === 'scores' && parts.length === 2 && method === 'PUT') {
        const id = parseId(parts[1], '成绩记录');
        const input = parseBody(init, scoreInputSchema);
        return ok({ score: await store.update((data) => {
          const score = findScore(data, id);
          Object.assign(score, {
            exam_name: input.exam_name,
            exam_date: input.exam_date,
            chinese: input.chinese ?? null,
            math: input.math ?? null,
            english: input.english ?? null,
            physics: input.physics ?? null,
            chemistry: input.chemistry ?? null,
            remark: input.remark,
            updated_at: now(),
            values: normalizeScoreValues(data, input),
          });
          return hydrateScore(data, score);
        }) });
      }

      if (parts[0] === 'scores' && parts.length === 2 && method === 'DELETE') {
        const id = parseId(parts[1], '成绩记录');
        await store.update((data) => {
          const index = data.scores.findIndex((score) => score.id === id);
          if (index < 0) throw new LocalApiError(404, 'SCORE_NOT_FOUND', '成绩记录不存在');
          data.scores.splice(index, 1);
        });
        return ok(undefined, 204);
      }

      if (parts[0] === 'students' && parts[2] === 'study-records' && method === 'GET') {
        const studentId = parseId(parts[1], '学生');
        const data = await store.read();
        findStudent(data, studentId);
        const records = data.studyRecords.filter((record) => record.student_id === studentId).sort((a, b) => a.record_date.localeCompare(b.record_date) || a.id - b.id);
        return ok({ records, total: records.length });
      }

      if (parts[0] === 'students' && parts[2] === 'study-records' && method === 'POST') {
        const studentId = parseId(parts[1], '学生');
        const input = parseBody(init, studyRecordInputSchema);
        return ok({ record: await store.update((data) => {
          findStudent(data, studentId);
          const created_at = now();
          const record = { id: data.nextIds.studyRecord++, student_id: studentId, ...input, created_at, updated_at: created_at };
          data.studyRecords.push(record);
          return record;
        }) }, 201);
      }

      if (parts[0] === 'study-records' && parts.length === 2 && method === 'PUT') {
        const id = parseId(parts[1], '晚辅记录');
        const input = parseBody(init, studyRecordInputSchema);
        return ok({ record: await store.update((data) => {
          const record = findStudyRecord(data, id);
          Object.assign(record, input, { updated_at: now() });
          return record;
        }) });
      }

      if (parts[0] === 'study-records' && parts.length === 2 && method === 'DELETE') {
        const id = parseId(parts[1], '晚辅记录');
        await store.update((data) => {
          const index = data.studyRecords.findIndex((record) => record.id === id);
          if (index < 0) throw new LocalApiError(404, 'STUDY_RECORD_NOT_FOUND', '晚辅记录不存在');
          data.studyRecords.splice(index, 1);
        });
        return ok(undefined, 204);
      }

      if (parts[0] === 'students' && parts[2] === 'courses' && method === 'GET') {
        const studentId = parseId(parts[1], '学生');
        const subject = parseSubject(url.searchParams.get('subject'));
        const data = await store.read();
        findStudent(data, studentId);
        const records = data.courseRecords.filter((record) => record.student_id === studentId && record.subject === subject).sort((a, b) => a.record_date.localeCompare(b.record_date) || a.id - b.id);
        return ok({ records, total: records.length });
      }

      if (parts[0] === 'students' && parts[2] === 'courses' && method === 'POST') {
        const studentId = parseId(parts[1], '学生');
        const input = parseBody(init, courseRecordInputSchema);
        return ok({ record: await store.update((data) => {
          findStudent(data, studentId);
          const created_at = now();
          const record = { id: data.nextIds.courseRecord++, student_id: studentId, ...input, created_at, updated_at: created_at };
          data.courseRecords.push(record);
          return record;
        }) }, 201);
      }

      if (parts[0] === 'course-records' && parts.length === 2 && method === 'PUT') {
        const id = parseId(parts[1], '课程记录');
        const input = parseBody(init, courseRecordInputSchema);
        return ok({ record: await store.update((data) => {
          const record = findCourseRecord(data, id);
          Object.assign(record, input, { updated_at: now() });
          return record;
        }) });
      }

      if (parts[0] === 'course-records' && parts.length === 2 && method === 'DELETE') {
        const id = parseId(parts[1], '课程记录');
        await store.update((data) => {
          const index = data.courseRecords.findIndex((record) => record.id === id);
          if (index < 0) throw new LocalApiError(404, 'COURSE_RECORD_NOT_FOUND', '课程记录不存在');
          data.courseRecords.splice(index, 1);
        });
        return ok(undefined, 204);
      }

      if (parts[0] === 'students' && parts[2] === 'archive' && method === 'GET') {
        const studentId = parseId(parts[1], '学生');
        const data = await store.read();
        const archive: StudentArchive = {
          student: publicStudent(data, findStudent(data, studentId)),
          scores: data.scores.filter((score) => score.student_id === studentId).map((score) => hydrateScore(data, score)),
          studyRecords: data.studyRecords.filter((record) => record.student_id === studentId),
          courseSections: SUBJECTS.map((subject) => ({
            subject,
            records: data.courseRecords.filter((record) => record.student_id === studentId && record.subject === subject),
          })),
        };
        return ok(archive);
      }

      throw new LocalApiError(404, 'NOT_FOUND', '接口不存在');
    } catch (error) {
      if (error instanceof LocalApiError) return fail(error);
      return fail(new LocalApiError(500, 'INTERNAL_ERROR', error instanceof Error ? error.message : '本地数据处理失败'));
    }
  }

  return { handle };
}
