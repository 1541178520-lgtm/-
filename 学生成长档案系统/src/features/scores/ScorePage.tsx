import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import type { Score, Student } from '../../../shared/contracts';
import { api, ApiClientError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { ScoreForm } from './ScoreForm';
import { ScoreTimeline } from './ScoreTimeline';

function ordered(scores: Score[]): Score[] {
  return [...scores].sort((left, right) => left.exam_date.localeCompare(right.exam_date) || left.created_at.localeCompare(right.created_at) || left.id - right.id);
}

export function ScorePage() {
  const { student } = useOutletContext<{ student: Student }>();
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Score | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Score | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    let active = true;
    void api<{ scores: Score[] }>(`/students/${student.id}/scores`)
      .then((result) => { if (active) setScores(result.scores); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : '成绩加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student.id]);

  async function remove() {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await api<void>(`/scores/${deleting.id}`, { method: 'DELETE' });
      setScores((current) => current.filter((score) => score.id !== deleting.id));
      setDeleting(null);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : '删除成绩失败');
      setDeleting(null);
    } finally { setBusyDelete(false); }
  }

  return (
    <section className="chapter-content">
      <div className="chapter-heading"><div><p className="chapter-number">第一章</p><h3>成绩成长记录</h3><p>按时间回看每次重要考试，观察持续变化。</p></div><button className="button button-primary no-print" type="button" onClick={() => setEditing('new')}>＋ 新增成绩</button></div>
      {error && <div className="banner-error" role="alert">{error}</div>}
      {loading ? <div className="section-loading">正在读取成绩…</div> : <ScoreTimeline scores={scores} onEdit={setEditing} onDelete={setDeleting} />}
      {editing && (
        <Modal title={editing === 'new' ? '新增成绩记录' : '编辑成绩记录'} onClose={() => setEditing(null)} wide>
          <ScoreForm studentId={student.id} score={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={(saved) => {
            setScores((current) => ordered(current.some((score) => score.id === saved.id) ? current.map((score) => score.id === saved.id ? saved : score) : [...current, saved]));
            setEditing(null);
          }} />
        </Modal>
      )}
      {deleting && <ConfirmDialog title="删除成绩记录" message={`确认删除“${deleting.exam_name}”吗？`} confirmLabel="确认删除成绩" busy={busyDelete} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </section>
  );
}
