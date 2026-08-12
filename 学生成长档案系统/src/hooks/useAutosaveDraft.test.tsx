import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAutosaveDraft } from './useAutosaveDraft';

describe('useAutosaveDraft', () => {
  it('debounces changes, saves on demand, and keeps a failed draft', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValueOnce({ text: 'new' }).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAutosaveDraft({ initial: { text: 'old' }, save, delay: 800 }));
    act(() => result.current.update({ text: 'new' }));
    expect(result.current.status).toBe('dirty');
    await act(async () => { await vi.advanceTimersByTimeAsync(800); await Promise.resolve(); });
    expect(result.current.status).toBe('saved');
    expect(save).toHaveBeenCalledWith({ text: 'new' });

    act(() => result.current.update({ text: 'still here' }));
    await act(async () => { await result.current.saveNow(); });
    expect(result.current.status).toBe('error');
    expect(result.current.draft.text).toBe('still here');
    vi.useRealTimers();
  });
});
