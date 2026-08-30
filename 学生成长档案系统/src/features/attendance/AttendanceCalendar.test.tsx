import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceCalendar } from './AttendanceCalendar';

describe('AttendanceCalendar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ dates: [] }) }));
  });

  it('loads a month and toggles a day with a check mark', async () => {
    const user = userEvent.setup();
    render(<AttendanceCalendar studentId={1} />);
    await screen.findByText('签到记录');
    const day = (await screen.findAllByRole('button', { name: /未签到/ }))[0];
    await user.click(day);
    await waitFor(() => expect(day).toHaveAttribute('aria-pressed', 'true'));
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/api/students/1/attendance/'), expect.objectContaining({ method: 'PUT' }));
  });
});
