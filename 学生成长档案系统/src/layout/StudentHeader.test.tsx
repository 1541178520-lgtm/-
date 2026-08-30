import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '../../shared/contracts';
import { StudentHeader } from './StudentHeader';

const student: Student = { id: 2, name: '李四', grade: '初二', school: '', join_date: null, remark: '', created_at: '', updated_at: '', tags: [] };
describe('StudentHeader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ dates: [] }) }));
  });
  it('offers previous/next navigation and downloads the full Word archive', async () => {
    const onPrevious = vi.fn(); const onNext = vi.fn(); const onExport = vi.fn();
    render(<MemoryRouter><StudentHeader student={student} onEdit={vi.fn()} onDelete={vi.fn()} onPrevious={onPrevious} onNext={onNext} onExport={onExport} exporting={false} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: '上一位学生' }));
    await userEvent.click(screen.getByRole('button', { name: '下一位学生' }));
    await userEvent.click(screen.getByRole('button', { name: '导出 Word 档案' }));
    expect(onPrevious).toHaveBeenCalledOnce(); expect(onNext).toHaveBeenCalledOnce(); expect(onExport).toHaveBeenCalledOnce();
    expect(screen.queryByText('打印档案')).not.toBeInTheDocument();
  });
});
