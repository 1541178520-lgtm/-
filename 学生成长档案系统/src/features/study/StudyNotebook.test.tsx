import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Student, StudyRecord } from '../../../shared/contracts';
import { StudyNotebook } from './StudyNotebook';

const student: Student = { id: 1, name: '张三', grade: '初一', school: '', join_date: null, remark: '', created_at: '', updated_at: '', tags: [] };
const records: StudyRecord[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1, student_id: 1, record_date: `2026-08-${String(index + 1).padStart(2, '0')}`,
  content: `第 ${index + 1} 天晚辅反馈`, created_at: `2026-08-11T00:00:${String(index).padStart(2, '0')}Z`, updated_at: `2026-08-11T00:00:${String(index).padStart(2, '0')}Z`,
}));

function response(body: unknown): Response { return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }); }
function Parent() { return <Outlet context={{ student }} />; }
function renderPage() {
  render(<MemoryRouter initialEntries={['/students/1/study']}><Routes><Route path="students/:studentId" element={<Parent />}><Route path="study" element={<StudyNotebook />} /></Route></Routes></MemoryRouter>);
}

describe('StudyNotebook', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('browses ten pages with correct boundaries and defaults new records to today', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ records, total: 10 })));
    renderPage();
    expect(await screen.findByText('第 1 页 / 共 10 页')).toBeInTheDocument();
    expect(screen.getByText('第 1 天晚辅反馈')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('第 2 天晚辅反馈')).toBeInTheDocument();
    expect(screen.getByText('第 2 页 / 共 10 页')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '新增晚辅记录' }));
    expect(screen.getAllByLabelText('记录日期').at(-1)).toHaveValue(new Date().toLocaleDateString('en-CA'));
  });

  it('edits the current page directly and autosaves without an edit dialog', async () => {
    const edited = { ...records[1], content: '直接修改后自动保存' };
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ records: records.slice(0, 2), total: 2 }))
      .mockResolvedValueOnce(response({ record: edited }));
    vi.stubGlobal('fetch', fetchStub);
    renderPage();
    await screen.findByText('第 1 页 / 共 2 页');
    await userEvent.click(screen.getByRole('button', { name: '下一页' }));
    await userEvent.clear(screen.getByLabelText('晚辅反馈'));
    await userEvent.type(screen.getByLabelText('晚辅反馈'), '直接修改后自动保存');
    await userEvent.tab();

    expect(await screen.findByText('已保存')).toBeInTheDocument();
    expect(screen.getByLabelText('晚辅反馈')).toHaveValue('直接修改后自动保存');
    expect(screen.queryByRole('button', { name: '编辑本页' })).not.toBeInTheDocument();
    await waitFor(() => expect(fetchStub).toHaveBeenNthCalledWith(2, '/api/study-records/2', expect.objectContaining({ method: 'PUT' })));
  });
});
