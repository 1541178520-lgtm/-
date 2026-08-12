import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CourseRecord, Student } from '../../../shared/contracts';
import { CourseNotebook } from './CourseNotebook';

const student: Student = { id: 1, name: '张三', grade: '初一', school: '', join_date: null, remark: '', created_at: '', updated_at: '', tags: [] };
const math: CourseRecord = { id: 1, student_id: 1, subject: '数学', record_date: '2026-08-01', course_content: '一次函数', feedback: '数学反馈', created_at: '', updated_at: '' };
const english: CourseRecord = { ...math, id: 2, subject: '英语', course_content: '一般过去时', feedback: '英语反馈' };
function response(body: unknown, status = 200): Response { return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
function Parent() { return <Outlet context={{ student }} />; }
function renderPage() {
  render(<MemoryRouter initialEntries={['/students/1/courses/数学']}><Routes><Route path="students/:studentId" element={<Parent />}><Route path="courses/:subject?" element={<CourseNotebook />} /></Route></Routes></MemoryRouter>);
}

describe('CourseNotebook', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('switches subjects without mixing their records', async () => {
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ records: [math], total: 1 }))
      .mockResolvedValueOnce(response({ records: [english], total: 1 }));
    vi.stubGlobal('fetch', fetchStub);
    renderPage();
    expect(await screen.findByText('数学反馈')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: '英语' }));
    expect(await screen.findByText('英语反馈')).toBeInTheDocument();
    expect(screen.queryByText('数学反馈')).not.toBeInTheDocument();
    expect(fetchStub).toHaveBeenNthCalledWith(2, expect.stringContaining('subject=%E8%8B%B1%E8%AF%AD'), expect.any(Object));
  });

  it('creates, edits, and deletes a course page', async () => {
    const created = { ...math, id: 3, course_content: '二次函数', feedback: '新反馈' };
    const edited = { ...created, feedback: '已修改反馈' };
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ records: [], total: 0 }))
      .mockResolvedValueOnce(response({ record: created }, 201))
      .mockResolvedValueOnce(response({ record: edited }))
      .mockResolvedValueOnce(response({}, 204));
    vi.stubGlobal('fetch', fetchStub);
    renderPage();
    await screen.findByText('尚无数学课程记录');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '新增课程记录' }));
    await user.type(screen.getByLabelText('课程内容'), '二次函数');
    await user.type(screen.getByLabelText('教师反馈'), '新反馈');
    await user.click(screen.getByRole('button', { name: '保存课程记录' }));
    expect(await screen.findByText('新反馈')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('教师反馈'));
    await user.type(screen.getByLabelText('教师反馈'), '已修改反馈');
    await user.tab();
    expect(await screen.findByText('已保存')).toBeInTheDocument();
    expect(screen.getByLabelText('教师反馈')).toHaveValue('已修改反馈');
    expect(screen.queryByRole('button', { name: '编辑本页' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除本页' }));
    await user.click(screen.getByRole('button', { name: '确认删除课程记录' }));
    await waitFor(() => expect(screen.getByText('尚无数学课程记录')).toBeInTheDocument());
  });
});
