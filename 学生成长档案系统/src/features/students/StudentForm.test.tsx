import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Student, Tag } from '../../../shared/contracts';
import { StudentForm } from './StudentForm';

const tags: Tag[] = [
  { id: 1, name: '重点关注', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z' },
  { id: 2, name: '数学提升', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z' },
];
const createdStudent: Student = {
  id: 8, name: '张三', grade: '初一', school: '实验学校', join_date: '2026-02-10', remark: '',
  created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-12T00:00:00Z', tags: [],
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('StudentForm', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows field errors instead of submitting blank name and grade', async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
    render(<StudentForm tags={tags} onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '保存学生' }));
    expect(await screen.findByText('姓名不能为空')).toBeInTheDocument();
    expect(screen.getByText('年级不能为空')).toBeInTheDocument();
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('creates a student and assigns selected tags before reporting success', async () => {
    const tagged = { ...createdStudent, tags: [tags[0]] };
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ student: createdStudent }, 201))
      .mockResolvedValueOnce(response({ student: tagged }));
    vi.stubGlobal('fetch', fetchStub);
    const onSaved = vi.fn();
    render(<StudentForm tags={tags} onSaved={onSaved} onCancel={vi.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('姓名'), '张三');
    await user.type(screen.getByLabelText('年级'), '初一');
    await user.type(screen.getByLabelText('学校'), '实验学校');
    await user.type(screen.getByLabelText('入学日期'), '2026-02-10');
    await user.click(screen.getByLabelText('重点关注'));
    await user.click(screen.getByRole('button', { name: '保存学生' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(tagged));
    expect(fetchStub).toHaveBeenNthCalledWith(1, '/api/students', expect.objectContaining({ method: 'POST' }));
    expect(fetchStub).toHaveBeenNthCalledWith(2, '/api/students/8/tags', expect.objectContaining({ method: 'PUT' }));
    expect(JSON.parse(fetchStub.mock.calls[1][1].body)).toEqual({ tag_ids: [1] });
  });

  it('updates an existing student with PUT', async () => {
    const updated = { ...createdStudent, name: '张小三', tags };
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response({ student: { ...updated, tags: [] } }))
      .mockResolvedValueOnce(response({ student: updated }));
    vi.stubGlobal('fetch', fetchStub);
    const onSaved = vi.fn();
    render(<StudentForm student={{ ...createdStudent, tags }} tags={tags} onSaved={onSaved} onCancel={vi.fn()} />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('姓名'));
    await user.type(screen.getByLabelText('姓名'), '张小三');
    await user.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(fetchStub).toHaveBeenNthCalledWith(1, '/api/students/8', expect.objectContaining({ method: 'PUT' }));
  });
});
