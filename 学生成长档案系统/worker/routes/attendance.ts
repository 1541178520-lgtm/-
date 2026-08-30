import { Hono } from 'hono';
import { attendanceMonthSchema, attendanceToggleSchema, isoDateSchema } from '../../shared/validation';
import { ApiException, parseJson } from '../lib/http';
import { getStudent, nowIso, parseId } from '../lib/repository';
import type { AppEnv } from '../types';

const attendance = new Hono<AppEnv>();

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

attendance.get('/students/:studentId/attendance', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const month = c.req.query('month') ?? currentMonth();
  const parsed = attendanceMonthSchema.safeParse(month);
  if (!parsed.success) throw new ApiException(422, 'INVALID_MONTH', '月份格式无效', { month: '请使用 YYYY-MM 格式' });
  const result = await c.env.DB.prepare(
    `SELECT attendance_date FROM attendance_records
     WHERE student_id = ? AND attendance_date LIKE ? ORDER BY attendance_date`,
  ).bind(studentId, `${month}-%`).all<{ attendance_date: string }>();
  return c.json({ month, dates: result.results.map((row) => row.attendance_date) });
});

attendance.put('/students/:studentId/attendance/:date', async (c) => {
  const studentId = parseId(c.req.param('studentId'), '学生');
  await getStudent(c.env.DB, studentId);
  const date = c.req.param('date');
  const parsedDate = isoDateSchema.safeParse(date);
  if (!parsedDate.success) throw new ApiException(422, 'INVALID_DATE', '签到日期无效', { date: '请输入有效日期' });
  const input = await parseJson(c, attendanceToggleSchema);
  const now = nowIso();
  if (input.signed) {
    await c.env.DB.prepare(
      `INSERT INTO attendance_records (student_id, attendance_date, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(student_id, attendance_date) DO UPDATE SET updated_at = excluded.updated_at`,
    ).bind(studentId, date, now, now).run();
  } else {
    await c.env.DB.prepare('DELETE FROM attendance_records WHERE student_id = ? AND attendance_date = ?').bind(studentId, date).run();
  }
  return c.json({ attendance: { student_id: studentId, attendance_date: date, signed: input.signed } });
});

export default attendance;
