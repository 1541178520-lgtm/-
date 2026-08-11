import { z } from 'zod';
import { SUBJECTS } from './constants';

const trimmed = (label: string, max: number) => z.string().trim().min(1, `${label}不能为空`).max(max, `${label}不能超过${max}个字符`);
const optionalTrimmed = (label: string, max: number) => z.string().trim().max(max, `${label}不能超过${max}个字符`).default('');

export const isoDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, '请输入有效日期');

export const studentInputSchema = z.object({
  name: trimmed('姓名', 80),
  grade: trimmed('年级', 40),
  school: optionalTrimmed('学校', 120),
  join_date: z.union([isoDateSchema, z.literal(''), z.null()]).transform((value) => value || null),
  remark: optionalTrimmed('备注', 2000),
});

export const tagInputSchema = z.object({ name: trimmed('标签名称', 30) });

const optionalScore = z.number().min(0, '成绩不能小于0').max(150, '成绩不能大于150').nullable();
export const scoreInputSchema = z.object({
  exam_name: trimmed('考试名称', 120),
  exam_date: isoDateSchema,
  chinese: optionalScore.default(null),
  math: optionalScore.default(null),
  english: optionalScore.default(null),
  physics: optionalScore.default(null),
  chemistry: optionalScore.default(null),
  remark: optionalTrimmed('备注', 2000),
});

export const studyRecordInputSchema = z.object({
  record_date: isoDateSchema,
  content: trimmed('晚辅内容', 20000),
});

export const courseRecordInputSchema = z.object({
  subject: z.enum(SUBJECTS),
  record_date: isoDateSchema,
  course_content: optionalTrimmed('课程内容', 500),
  feedback: trimmed('教师反馈', 20000),
});

export const loginInputSchema = z.object({
  username: trimmed('用户名', 64).pipe(z.string().min(3, '用户名至少3个字符')),
  password: z.string().min(8, '密码至少8个字符').max(128, '密码不能超过128个字符'),
});

export type StudentInput = z.infer<typeof studentInputSchema>;
export type TagInput = z.infer<typeof tagInputSchema>;
export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type StudyRecordInput = z.infer<typeof studyRecordInputSchema>;
export type CourseRecordInput = z.infer<typeof courseRecordInputSchema>;
