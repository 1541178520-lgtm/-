import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Score, Student } from '../../../shared/contracts';
import { ScorePage } from './ScorePage';

const student: Student = {
  id: 1, name: '张三', grade: '初一', school: '', join_date: null, remark: '',
  created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z', tags: [],
};
const scores: Score[] = [
  { id: 1, student_id: 1, exam_name: '入学考试', exam_date: '2026-02-10', chinese: 0, math: 75, english: 82, physics: null, chemistry: null, remark: '', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z' },
  { id: 2, student_id: 1, exam_name: '期中考试', exam_date: '2026-05-10', chinese: 80, math: 82, english: 85, physics: 70, chemistry: null, remark: '持续进步', created_at: '2026-08-11T00:00:01Z', updated_at: '2026-08-11T00:00:01Z' },
  { id: 3, student_id: 1, exam_name: '期末考试', exam_date: '2026-07-05', chinese: 86, math: 88, english: 91, physics: 78, chemistry: null, remark: '', created_at: '2026-08-11T00:00:02Z', updated_at: '2026-08-11T00:00:02Z' },
];

function response(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function Parent() { return <Outlet context={{ student }} />; }
function renderPage() {
  render(
    <MemoryRouter initialEntries={['/students/1/scores']}>
      <Routes><Route path="students/:studentId" element={<Parent />}><Route path="scores" element={<ScorePage />} /></Route></Routes>
    </MemoryRouter>,
  );
}

describe('ScorePage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows chronological exams, preserves zero, and hides empty subjects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ scores })));
    renderPage();

    const headings = await screen.findAllByRole('heading', { level: 4 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['入学考试', '期中考试', '期末考试']);
    const first = screen.getByTestId('score-1');
    expect(within(first).getByText('0')).toBeInTheDocument();
    expect(within(first).queryByText('物理')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('score-2')).getByText('物理')).toBeInTheDocument();
  });

  it('edits and deletes records through the expected endpoints', async () => {
    const updated = { ...scores[0], exam_name: '春季入学考试', math: 77 };
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ scores }))
      .mockResolvedValueOnce(response({ score: updated }))
      .mockResolvedValueOnce(response({}, 204));
    vi.stubGlobal('fetch', fetchStub);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: '编辑入学考试' }));
    await user.clear(screen.getByLabelText('考试名称'));
    await user.type(screen.getByLabelText('考试名称'), '春季入学考试');
    await user.clear(screen.getByLabelText('数学'));
    await user.type(screen.getByLabelText('数学'), '77');
    await user.click(screen.getByRole('button', { name: '保存修改' }));
    expect(await screen.findByRole('heading', { name: '春季入学考试' })).toBeInTheDocument();
    expect(fetchStub).toHaveBeenNthCalledWith(2, '/api/scores/1', expect.objectContaining({ method: 'PUT' }));

    await user.click(screen.getByRole('button', { name: '删除春季入学考试' }));
    await user.click(screen.getByRole('button', { name: '确认删除成绩' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: '春季入学考试' })).not.toBeInTheDocument());
    expect(fetchStub).toHaveBeenNthCalledWith(3, '/api/scores/1', expect.objectContaining({ method: 'DELETE' }));
  });
});
