import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudentArchive } from '../../../shared/contracts';
import { PrintArchivePage } from './PrintArchivePage';

const archive: StudentArchive = {
  student: { id: 1, name: '张三', grade: '初一', school: '实验学校', join_date: '2026-02-10', remark: '', created_at: '', updated_at: '', tags: [] },
  scores: [{ id: 1, student_id: 1, exam_name: '入学考试', exam_date: '2026-02-10', chinese: null, math: 75, english: 82, physics: null, chemistry: null, remark: '', created_at: '', updated_at: '' }],
  studyRecords: [{ id: 1, student_id: 1, record_date: '2026-08-10', content: '晚辅反馈正文', created_at: '', updated_at: '' }],
  courseSections: [
    { subject: '数学', records: [{ id: 1, student_id: 1, subject: '数学', record_date: '2026-08-01', course_content: '一次函数', feedback: '数学反馈', created_at: '', updated_at: '' }] },
    { subject: '英语', records: [{ id: 2, student_id: 1, subject: '英语', record_date: '2026-08-02', course_content: '一般过去时', feedback: '英语反馈', created_at: '', updated_at: '' }] },
    { subject: '物理', records: [{ id: 3, student_id: 1, subject: '物理', record_date: '2026-08-03', course_content: '力学', feedback: '物理反馈', created_at: '', updated_at: '' }] },
  ],
};

describe('PrintArchivePage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the complete archive but omits empty subject chapters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(archive), { status: 200 })));
    render(<MemoryRouter initialEntries={['/students/1/print']}><Routes><Route path="students/:studentId/print" element={<PrintArchivePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '学生成长档案', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('入学考试')).toBeInTheDocument();
    expect(screen.getByText('晚辅反馈正文')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '数学课程档案' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '英语课程档案' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '物理课程档案' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '剑桥课程档案' })).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('uses the browser native print dialog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(archive), { status: 200 })));
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<MemoryRouter initialEntries={['/students/1/print']}><Routes><Route path="students/:studentId/print" element={<PrintArchivePage />} /></Routes></MemoryRouter>);

    await userEvent.click(await screen.findByRole('button', { name: '打印或另存为 PDF' }));
    expect(print).toHaveBeenCalledOnce();
  });
});
