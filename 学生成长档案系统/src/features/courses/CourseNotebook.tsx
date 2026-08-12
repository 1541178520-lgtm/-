import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { SUBJECTS, type Subject } from '../../../shared/constants';
import type { CourseRecord, Student } from '../../../shared/contracts';
import { api, ApiClientError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { NotebookPager } from '../../components/NotebookPager';
import { CourseForm } from './CourseForm';
import { CourseSubjects } from './CourseSubjects';
import { InlineCourseEditor } from './InlineCourseEditor';

function ordered(records: CourseRecord[]) { return [...records].sort((a, b) => a.record_date.localeCompare(b.record_date) || a.created_at.localeCompare(b.created_at) || a.id - b.id); }

export function CourseNotebook() {
  const { student } = useOutletContext<{ student: Student }>();
  const { subject: rawSubject } = useParams();
  const subject = SUBJECTS.includes(rawSubject as Subject) ? rawSubject as Subject : undefined;
  const [records, setRecords] = useState<CourseRecord[]>([]);
  const [loadedSubject, setLoadedSubject] = useState<Subject | undefined>();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<'new' | null>(null);
  const [deleting, setDeleting] = useState<CourseRecord | null>(null);
  const current = records[index];

  useEffect(() => {
    if (!subject) return;
    let active = true;
    void api<{ records: CourseRecord[] }>(`/students/${student.id}/courses?subject=${encodeURIComponent(subject)}`)
      .then((result) => { if (active) { setRecords(result.records); setIndex(0); setLoadedSubject(subject); setError(''); } })
      .catch((caught: unknown) => { if (active) { setError(caught instanceof Error ? caught.message : '课程记录加载失败'); setLoadedSubject(subject); } });
    return () => { active = false; };
  }, [student.id, subject]);

  function save(saved: CourseRecord) {
    const next = ordered(records.some((record) => record.id === saved.id) ? records.map((record) => record.id === saved.id ? saved : record) : [...records, saved]);
    setRecords(next); setIndex(next.findIndex((record) => record.id === saved.id)); setEditing(null);
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api<void>(`/course-records/${deleting.id}`, { method: 'DELETE' });
      const next = records.filter((record) => record.id !== deleting.id);
      setRecords(next); setIndex((value) => Math.max(0, Math.min(value, next.length - 1))); setDeleting(null);
    } catch (caught) { setError(caught instanceof ApiClientError ? caught.message : '删除课程记录失败'); setDeleting(null); }
  }

  return (
    <section className="chapter-content notebook-section">
      <div className="chapter-heading"><div><p className="chapter-number">第三章起</p><h3>课程档案</h3><p>选择科目，逐页查阅每一次课程内容与教师反馈。</p></div>{subject && <button className="button button-primary no-print" type="button" aria-label="新增课程记录" onClick={() => setEditing('new')}>＋ 新增课程记录</button>}</div>
      <CourseSubjects studentId={student.id} active={subject} />
      {error && <div className="banner-error" role="alert">{error}</div>}
      {!subject ? <div className="empty-chapter"><span>课</span><h4>请选择课程科目</h4><p>从上方选择语文、数学、英语等课程档案。</p></div> : loadedSubject !== subject ? <div className="section-loading">正在读取{subject}课程笔记…</div> : records.length === 0 ? <div className="empty-chapter"><span>课</span><h4>尚无{subject}课程记录</h4><p>新增一页课程反馈，开始建立{subject}课程档案。</p></div> : (
        <>
          <article className="notebook-page course-page">
            <header><div><p>《{subject}课程档案》· 第 {index + 1} 页</p></div><div className="record-actions no-print"><button type="button" className="danger-text" onClick={() => setDeleting(current)}>删除本页</button></div></header>
            <InlineCourseEditor key={current.id} record={current} onSaved={save} />
            <footer>创建于 {new Date(current.created_at).toLocaleString('zh-CN')} · 最后修改 {new Date(current.updated_at).toLocaleString('zh-CN')}</footer>
          </article>
          <NotebookPager currentIndex={index} total={records.length} onPrevious={() => setIndex((value) => Math.max(0, value - 1))} onNext={() => setIndex((value) => Math.min(records.length - 1, value + 1))} />
        </>
      )}
      {editing && subject && <Modal title={`新增${subject}课程记录`} onClose={() => setEditing(null)} wide><CourseForm studentId={student.id} subject={subject} onCancel={() => setEditing(null)} onSaved={save} /></Modal>}
      {deleting && <ConfirmDialog title="删除课程记录" message={`确认删除 ${deleting.record_date} 的${deleting.subject}课程反馈吗？`} confirmLabel="确认删除课程记录" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </section>
  );
}
