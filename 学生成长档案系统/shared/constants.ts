export const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '自然拼读', '剑桥'] as const;

export type Subject = (typeof SUBJECTS)[number];

export const SCORE_SUBJECTS = [
  ['chinese', '语文'],
  ['math', '数学'],
  ['english', '英语'],
  ['physics', '物理'],
  ['chemistry', '化学'],
] as const;
