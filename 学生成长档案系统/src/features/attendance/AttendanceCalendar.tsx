import { useEffect, useMemo, useState } from 'react';
import { api, ApiClientError, jsonBody } from '../../api/client';

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, offset: number): string {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(year, value - 1 + offset, 1);
  return monthKey(date);
}

function daysInMonth(month: string): number {
  const [year, value] = month.split('-').map(Number);
  return new Date(year, value, 0).getDate();
}

function firstWeekday(month: string): number {
  const [year, value] = month.split('-').map(Number);
  return new Date(year, value - 1, 1).getDay();
}

export function AttendanceCalendar({ studentId }: { studentId: number }) {
  const [month, setMonth] = useState(monthKey());
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDate, setBusyDate] = useState('');
  const [error, setError] = useState('');
  const signed = useMemo(() => new Set(dates), [dates]);
  const totalDays = daysInMonth(month);
  const cells = useMemo(() => Array.from({ length: firstWeekday(month) + totalDays }, (_, index) => index < firstWeekday(month) ? null : index - firstWeekday(month) + 1), [month, totalDays]);
  const monthLabel = `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
  const today = new Date().toLocaleDateString('en-CA');

  function changeMonth(next: string) {
    setLoading(true); setError(''); setMonth(next);
  }

  useEffect(() => {
    let active = true;
    void api<{ dates: string[] }>(`/students/${studentId}/attendance?month=${month}`)
      .then((result) => { if (active) setDates(result.dates); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof ApiClientError ? caught.message : '签到记录加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, month]);

  async function toggle(day: number) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const nextSigned = !signed.has(date);
    setBusyDate(date); setError('');
    setDates((current) => nextSigned ? [...current, date].sort() : current.filter((item) => item !== date));
    try {
      await api(`/students/${studentId}/attendance/${date}`, { method: 'PUT', body: jsonBody({ signed: nextSigned }) });
    } catch (caught) {
      setDates((current) => nextSigned ? current.filter((item) => item !== date) : [...current, date].sort());
      setError(caught instanceof ApiClientError ? caught.message : '签到保存失败，请重试');
    } finally { setBusyDate(''); }
  }

  return <section className="attendance-panel" aria-label="学生签到区">
    <div className="attendance-heading">
      <div><p className="attendance-kicker">每日学习打卡</p><h3>签到记录</h3></div>
      <div className="attendance-controls">
        <button type="button" aria-label="上个月" onClick={() => changeMonth(shiftMonth(month, -1))}>‹</button>
        <strong>{monthLabel}</strong>
        <button type="button" aria-label="下个月" onClick={() => changeMonth(shiftMonth(month, 1))}>›</button>
      </div>
      <span className="attendance-count">本月已签到 <b>{dates.length}</b> 天</span>
    </div>
    <div className="attendance-weekdays" aria-hidden="true">{['日', '一', '二', '三', '四', '五', '六'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
    <div className={`attendance-grid${loading ? ' is-loading' : ''}`}>
      {cells.map((day, index) => day === null ? <span className="attendance-empty" key={`empty-${index}`} /> : (() => {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const isSigned = signed.has(date);
        return <button key={date} type="button" className={`attendance-day${isSigned ? ' is-signed' : ''}${date === today ? ' is-today' : ''}`} aria-label={`${date}${isSigned ? ' 已签到' : ' 未签到'}`} aria-pressed={isSigned} disabled={busyDate === date || loading} onClick={() => void toggle(day)}><span>{day}</span>{isSigned && <b aria-hidden="true">✓</b>}</button>;
      })())}
    </div>
    <div className="attendance-footer"><span><i className="attendance-dot signed" />已签到</span><span><i className="attendance-dot" />点击日期签到/取消</span>{error && <em role="alert">{error}</em>}</div>
  </section>;
}
