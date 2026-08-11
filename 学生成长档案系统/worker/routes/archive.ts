import { Hono } from 'hono';
import { SUBJECTS, type Subject } from '../../shared/constants';
import type { CourseRecord, Score, StudyRecord, StudentArchive } from '../../shared/contracts';
import { getStudent, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const archives = new Hono<AppEnv>();

archives.get('/students/:studentId/archive', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  const student = await getStudent(c.env.DB, studentId);
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT id, student_id, exam_name, exam_date, chinese, math, english, physics,
        chemistry, remark, created_at, updated_at
       FROM scores WHERE student_id = ? ORDER BY exam_date, created_at, id`,
    ).bind(studentId),
    c.env.DB.prepare(
      `SELECT id, student_id, record_date, content, created_at, updated_at
       FROM study_records WHERE student_id = ? ORDER BY record_date, created_at, id`,
    ).bind(studentId),
    c.env.DB.prepare(
      `SELECT id, student_id, subject, record_date, course_content, feedback, created_at, updated_at
       FROM course_records WHERE student_id = ? ORDER BY record_date, created_at, id`,
    ).bind(studentId),
  ]);

  const scores = results[0].results as unknown as Score[];
  const studyRecords = results[1].results as unknown as StudyRecord[];
  const courseRecords = results[2].results as unknown as CourseRecord[];
  const bySubject = new Map<Subject, CourseRecord[]>();
  for (const record of courseRecords) {
    const records = bySubject.get(record.subject) ?? [];
    records.push(record);
    bySubject.set(record.subject, records);
  }

  const archive: StudentArchive = {
    student,
    scores,
    studyRecords,
    courseSections: SUBJECTS.flatMap((subject) => {
      const records = bySubject.get(subject);
      return records?.length ? [{ subject, records }] : [];
    }),
  };
  return c.json(archive);
});

export default archives;
