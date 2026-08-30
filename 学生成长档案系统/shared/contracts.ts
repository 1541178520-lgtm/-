import type { Subject } from './constants.js';

export interface Tag {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  name: string;
  grade: string;
  school: string;
  join_date: string | null;
  remark: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Score {
  id: number;
  student_id: number;
  exam_name: string;
  exam_date: string;
  chinese: number | null;
  math: number | null;
  english: number | null;
  physics: number | null;
  chemistry: number | null;
  remark: string;
  created_at: string;
  updated_at: string;
  values: ScoreValue[];
}

export interface ScoreSubject {
  id: number;
  name: string;
  is_default: number;
  created_at: string;
}

export interface ScoreValue {
  subject_id: number;
  subject_name: string;
  value: number;
}

export interface StudyRecord {
  id: number;
  student_id: number;
  record_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  student_id: number;
  attendance_date: string;
  created_at: string;
  updated_at: string;
}

export interface CourseRecord {
  id: number;
  student_id: number;
  subject: Subject;
  record_date: string;
  course_content: string;
  feedback: string;
  created_at: string;
  updated_at: string;
}

export interface CourseSection {
  subject: Subject;
  records: CourseRecord[];
}

export interface StudentArchive {
  student: Student;
  scores: Score[];
  studyRecords: StudyRecord[];
  courseSections: CourseSection[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface SessionAdmin {
  id: number;
  username: string;
}
