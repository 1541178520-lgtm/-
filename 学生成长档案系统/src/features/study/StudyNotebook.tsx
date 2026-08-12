import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import type { Student, StudyRecord } from '../../../shared/contracts';
import { api, ApiClientError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { NotebookPager } from '../../components/NotebookPager';
import { StudyForm } from './StudyForm';
import { InlineStudyEditor } from './InlineStudyEditor';

function ordered(records: StudyRecord[]) { return [...records].sort((a, b) => a.record_date.localeCompare(b.record_date) || a.created_at.localeCompare(b.created_at) || a.id - b.id); }

export function StudyNotebook() {
  const { student } = useOutletContext<{ student: Student }>();
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<'new' | null>(null);
  const [deleting, setDeleting] = useState<StudyRecord | null>(null);
  const current = records[index];

  useEffect(() => {
    let active = true;
    void api<{ records: StudyRecord[] }>(`/students/${student.id}/study-records`)
      .then((result) => { if (active) setRecords(result.records); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : '晚辅记录加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student.id]);

  function save(saved: StudyRecord) {
    const next = ordered(records.some((record) => record.id === saved.id) ? records.map((record) => record.id === saved.id ? saved : record) : [...records, saved]);
    setRecords(next); setIndex(next.findIndex((record) => record.id === saved.id)); setEditing(null);
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api<void>(`/study-records/${deleting.id}`, { method: 'DELETE' });
      const next = records.filter((record) => record.id !== deleting.id);
      setRecords(next); setIndex((value) => Math.max(0, Math.min(value, next.length - 1))); setDeleting(null);
    } catch (caught) { setError(caught instanceof ApiClientError ? caught.message : '删除晚辅记录失败'); setDeleting(null); }
  }

  return (
    <section className="chapter-content notebook-section">
      <div className="chapter-heading"><div><p className="chapter-number">第二章</p><h3>晚辅成长记录</h3><p>一页一日，持续保留老师最真实的观察与反馈。</p></div><button className="button button-primary no-print" type="button" aria-label="新增晚辅记录" onClick={() => setEditing('new')}>＋ 新增晚辅记录</button></div>
      {error && <div className="banner-error" role="alert">{error}</div>}
      {loading ? <div className="section-loading">正在读取晚辅笔记…</div> : records.length === 0 ? <div className="empty-chapter"><span>辅</span><h4>尚无晚辅记录</h4><p>新增一页晚辅反馈，记录今天的学习状态。</p></div> : (
        <>
          <article className="notebook-page">
            <header><div><p>晚辅档案 · 第 {index + 1} 页</p></div><div className="record-actions no-print"><button type="button" className="danger-text" onClick={() => setDeleting(current)}>删除本页</button></div></header>
            <InlineStudyEditor key={current.id} record={current} onSaved={save} />
            <footer>创建于 {new Date(current.created_at).toLocaleString('zh-CN')} · 最后修改 {new Date(current.updated_at).toLocaleString('zh-CN')}</footer>
          </article>
          <NotebookPager currentIndex={index} total={records.length} onPrevious={() => setIndex((value) => Math.max(0, value - 1))} onNext={() => setIndex((value) => Math.min(records.length - 1, value + 1))} />
        </>
      )}
      {editing && <Modal title="新增晚辅记录" onClose={() => setEditing(null)} wide><StudyForm studentId={student.id} onCancel={() => setEditing(null)} onSaved={save} /></Modal>}
      {deleting && <ConfirmDialog title="删除晚辅记录" message={`确认删除 ${deleting.record_date} 的晚辅反馈吗？`} confirmLabel="确认删除晚辅记录" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </section>
  );
}
