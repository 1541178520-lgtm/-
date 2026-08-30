import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CourseRecord, Score, ScoreSubject, StudyRecord, Student, Tag } from '../shared/contracts.js';
import { SCORE_SUBJECTS } from '../shared/constants.js';

export interface LocalData {
  nextIds: {
    student: number;
    tag: number;
    score: number;
    scoreSubject: number;
    studyRecord: number;
  courseRecord: number;
  };
  students: Array<Omit<Student, 'tags'> & { tagIds: number[] }>;
  tags: Tag[];
  scoreSubjects: ScoreSubject[];
  scores: Score[];
  studyRecords: StudyRecord[];
  courseRecords: CourseRecord[];
  attendanceRecords: Array<{ student_id: number; attendance_date: string; created_at: string; updated_at: string }>;
}

const nowIso = () => new Date().toISOString();

function createInitialData(): LocalData {
  const created_at = nowIso();
  const scoreSubjects = SCORE_SUBJECTS.map(([, name], index) => ({
    id: index + 1,
    name,
    is_default: 1,
    created_at,
  }));
  return {
    nextIds: {
      student: 1,
      tag: 1,
      score: 1,
      scoreSubject: scoreSubjects.length + 1,
      studyRecord: 1,
      courseRecord: 1,
    },
    students: [],
    tags: [],
    scoreSubjects,
    scores: [],
    studyRecords: [],
    courseRecords: [],
    attendanceRecords: [],
  };
}

export class LocalStore {
  constructor(private readonly dataPath: string) {}

  async read(): Promise<LocalData> {
    try {
      const raw = await readFile(this.dataPath, 'utf8');
      return { ...createInitialData(), ...JSON.parse(raw) as LocalData };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const initial = createInitialData();
      await this.write(initial);
      return initial;
    }
  }

  async write(data: LocalData): Promise<void> {
    await mkdir(path.dirname(this.dataPath), { recursive: true });
    await writeFile(this.dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  async exportTo(filePath: string): Promise<void> {
    const data = await this.read();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  async importFrom(filePath: string): Promise<void> {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as LocalData;
    validateLocalData(data);
    await this.write(data);
  }

  async update<T>(mutate: (data: LocalData) => T | Promise<T>): Promise<T> {
    const data = await this.read();
    const result = await mutate(data);
    await this.write(data);
    return result;
  }
}

export function now(): string {
  return nowIso();
}

function validateLocalData(data: LocalData): void {
  const valid =
    data &&
    typeof data === 'object' &&
    data.nextIds &&
    Array.isArray(data.students) &&
    Array.isArray(data.tags) &&
    Array.isArray(data.scoreSubjects) &&
    Array.isArray(data.scores) &&
    Array.isArray(data.studyRecords) &&
    Array.isArray(data.courseRecords);
  if (!valid) throw new Error('备份文件格式不正确');
}
