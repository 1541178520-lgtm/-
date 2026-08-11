import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { SCORE_SUBJECTS } from '../../../shared/constants';
import type { StudentArchive } from '../../../shared/contracts';
import { api } from '../../api/client';

export function PrintArchivePage() {
  const { studentId } = useParams();
  const [archive, setArchive] = useState<StudentArchive | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void api<StudentArchive>(`/students/${studentId}/archive`)
      .then((result) => { if (active) setArchive(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : '完整档案加载失败'); });
    return () => { active = false; };
  }, [studentId]);

  if (error) return <main className="print-state"><div role="alert">{error}</div><Link to={`/students/${studentId}/scores`}>返回学生档案</Link></main>;
  if (!archive) return <main className="print-state" role="status">正在编排完整档案…</main>;
  const { student } = archive;

  return (
    <div className="print-shell">
      <nav className="print-toolbar no-print" aria-label="打印操作">
        <Link className="button button-secondary" to={`/students/${student.id}/scores`}>← 返回学生档案</Link>
        <div><p>请在打印窗口中选择打印机，或选择“另存为 PDF”。</p><button className="button button-primary" type="button" onClick={() => window.print()}>打印或另存为 PDF</button></div>
      </nav>
      <main className="print-document">
        <section className="print-cover">
          <div className="cover-border">
            <p>Student Growth Archive</p>
            <h1>学生成长档案</h1>
            <div className="cover-rule" />
            <dl>
              <div><dt>学生姓名</dt><dd>{student.name}</dd></div>
              <div><dt>学校</dt><dd>{student.school || '—'}</dd></div>
              <div><dt>年级</dt><dd>{student.grade}</dd></div>
              <div><dt>入学日期</dt><dd>{student.join_date || '—'}</dd></div>
            </dl>
            {student.tags.length > 0 && <div className="print-tags">{student.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>}
            <footer>成长有迹 · 记录每一次进步</footer>
          </div>
        </section>

        <section className="print-chapter chapter-break">
          <header className="print-chapter-title"><span>第一章</span><h2>成绩成长记录</h2></header>
          {archive.scores.length === 0 ? <p className="print-empty">暂无成绩记录</p> : archive.scores.map((score) => (
            <article className="print-record print-score" key={score.id}>
              <header><div><time>{score.exam_date}</time><h3>{score.exam_name}</h3></div></header>
              <dl>{SCORE_SUBJECTS.map(([key, label]) => score[key] === null ? null : <div key={key}><dt>{label}</dt><dd>{score[key]}</dd></div>)}</dl>
              {score.remark && <p>{score.remark}</p>}
            </article>
          ))}
        </section>

        <section className="print-chapter chapter-break">
          <header className="print-chapter-title"><span>第二章</span><h2>晚辅成长记录</h2></header>
          {archive.studyRecords.length === 0 ? <p className="print-empty">暂无晚辅记录</p> : archive.studyRecords.map((record, index) => (
            <article className="print-record print-note" key={record.id}>
              <header><span>第 {index + 1} 页</span><time>{record.record_date}</time></header>
              <p>{record.content}</p>
            </article>
          ))}
        </section>

        {archive.courseSections.map((section, sectionIndex) => (
          <section className="print-chapter chapter-break" key={section.subject}>
            <header className="print-chapter-title"><span>第 {sectionIndex + 3} 章</span><h2>{section.subject}课程档案</h2></header>
            {section.records.map((record, index) => (
              <article className="print-record print-note" key={record.id}>
                <header><span>第 {index + 1} 页</span><time>{record.record_date}</time></header>
                {record.course_content && <h3>{record.course_content}</h3>}
                <p>{record.feedback}</p>
              </article>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
