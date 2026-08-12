import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { StudentArchive } from '../../../shared/contracts';
import { buildArchiveDocx } from './archiveDocx';

const archive: StudentArchive = {
  student: { id: 1, name: '张三', grade: '初一', school: '创新学校', join_date: '2026-02-01', remark: '', created_at: '', updated_at: '', tags: [] },
  scores: [{ id: 1, student_id: 1, exam_name: '期中', exam_date: '2026-05-01', chinese: null, math: 88, english: null, physics: null, chemistry: null, remark: '', created_at: '', updated_at: '', values: [{ subject_id: 2, subject_name: '数学', value: 88 }] }],
  studyRecords: [{ id: 1, student_id: 1, record_date: '2026-08-01', content: '认真完成作业', created_at: '', updated_at: '' }],
  courseSections: [{ subject: '数学', records: [{ id: 1, student_id: 1, subject: '数学', record_date: '2026-08-02', course_content: '一次函数', feedback: '理解到位', created_at: '', updated_at: '' }] }],
};

describe('buildArchiveDocx', () => {
  it('builds a Word archive with logo, dynamic subjects, section breaks, and page fields', async () => {
    const blob = await buildArchiveDocx(archive, new Uint8Array([255, 216, 255, 217]), new Uint8Array([255, 216, 1, 255, 217]));
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    const footer = await zip.file('word/footer1.xml')!.async('string');
    expect(xml).toContain('学生成长档案');
    expect(xml).toContain('数学');
    expect(xml).not.toContain('语文');
    expect(xml).toContain('认真完成作业');
    expect(xml).toContain('任何学业问题，扫码咨询');
    expect(xml).toContain('w:type w:val="nextPage"');
    expect(footer).toContain('PAGE');
    expect(Object.values(zip.files).filter((entry) => !entry.dir && entry.name.startsWith('word/media/'))).toHaveLength(2);
  });
});
