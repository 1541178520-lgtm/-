import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Tag } from '../../../shared/contracts';
import { TagManager } from './TagManager';

const initial: Tag[] = [
  { id: 1, name: '重点关注', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T00:00:00Z' },
];

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('TagManager', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds a trimmed tag and reports the changed list', async () => {
    const newTag: Tag = { id: 2, name: '数学提升', created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-12T00:00:00Z' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ tag: newTag }, 201)));
    const onChanged = vi.fn();
    render(<TagManager tags={initial} onChanged={onChanged} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('新标签名称'), ' 数学提升 ');
    await userEvent.click(screen.getByRole('button', { name: '新增标签' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith([newTag, ...initial]));
  });

  it('shows the server duplicate-name error without closing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      error: { code: 'TAG_NAME_EXISTS', message: '标签名称已经存在', fields: { name: '标签名称已经存在' } },
    }, 409)));
    render(<TagManager tags={initial} onChanged={vi.fn()} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('新标签名称'), '重点关注');
    await userEvent.click(screen.getByRole('button', { name: '新增标签' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('标签名称已经存在');
    expect(screen.getByText('重点关注')).toBeInTheDocument();
  });

  it('requires confirmation before deleting a tag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ deleted: true, affectedStudents: 2 })));
    const onChanged = vi.fn();
    render(<TagManager tags={initial} onChanged={onChanged} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '删除重点关注' }));
    expect(screen.getByText('将从所有已关联学生的档案中移除此标签。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '确认删除标签' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith([]));
  });
});
