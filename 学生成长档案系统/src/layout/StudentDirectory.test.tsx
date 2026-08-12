import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Student } from '../../shared/contracts';
import { StudentDirectory } from './StudentDirectory';

const base = {
  school: '', join_date: null, remark: '', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z', tags: [],
};
const students: Student[] = [
  { ...base, id: 1, name: '张三', grade: '初一' },
  { ...base, id: 2, name: '李四', grade: '初一' },
  { ...base, id: 3, name: '张小雨', grade: '初二' },
];

describe('StudentDirectory', () => {
  it('shows compact Innovation Academy branding', () => {
    render(<MemoryRouter><StudentDirectory students={students} selectedStudentId={null} onAdd={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('img', { name: '创新学苑教育' })).toHaveAttribute('src', '/brand/innovation-academy-logo.jpg');
  });

  it('groups students by grade and collapses a grade', async () => {
    render(
      <MemoryRouter>
        <StudentDirectory students={students} selectedStudentId={null} onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    const grade = screen.getByRole('button', { name: /初一/ });
    expect(within(screen.getByTestId('grade-初一')).getByText('张三')).toBeInTheDocument();

    await userEvent.click(grade);
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
    expect(screen.getByText('张小雨')).toBeInTheDocument();
  });

  it('instantly filters names containing 张 across grades', async () => {
    render(
      <MemoryRouter>
        <StudentDirectory students={students} selectedStudentId={null} onAdd={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: '搜索学生' }), '张');

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('张小雨')).toBeInTheDocument();
    expect(screen.queryByText('李四')).not.toBeInTheDocument();
  });
});
