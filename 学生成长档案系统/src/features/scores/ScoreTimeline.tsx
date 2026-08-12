import type { Score } from '../../../shared/contracts';
interface Props { scores: Score[]; onEdit: (score: Score) => void; onDelete: (score: Score) => void; }
export function ScoreTimeline({ scores, onEdit, onDelete }: Props) {
  if (scores.length === 0) return <div className="empty-chapter"><span aria-hidden="true">一</span><h4>尚无成绩记录</h4><p>添加一次重要考试，开始记录学生的成绩变化。</p></div>;
  return <ol className="score-timeline">{scores.map((score, index) => <li key={score.id}>
    <div className="timeline-marker"><span>{index + 1}</span></div>
    <article className="score-card" data-testid={`score-${score.id}`}>
      <header><div><time>{score.exam_date}</time><h4>{score.exam_name}</h4></div><div className="record-actions no-print"><button type="button" onClick={() => onEdit(score)} aria-label={`编辑${score.exam_name}`}>编辑</button><button type="button" className="danger-text" onClick={() => onDelete(score)} aria-label={`删除${score.exam_name}`}>删除</button></div></header>
      {score.values.length > 0 && <dl className="score-subjects">{score.values.map((item) => <div key={item.subject_id}><dt>{item.subject_name}</dt><dd>{item.value}</dd></div>)}</dl>}
      {score.remark && <p className="record-remark">{score.remark}</p>}
    </article>
  </li>)}</ol>;
}
