import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Score, ScoreSubject } from '../../../shared/contracts';
import { scoreInputSchema } from '../../../shared/validation';
import { api, ApiClientError, jsonBody } from '../../api/client';

interface Props { studentId: number; score?: Score; onSaved: (score: Score) => void; onCancel: () => void; }
const today = () => new Date().toLocaleDateString('en-CA');

export function ScoreForm({ studentId, score, onSaved, onCancel }: Props) {
  const [examName, setExamName] = useState(score?.exam_name ?? '');
  const [examDate, setExamDate] = useState(score?.exam_date ?? today());
  const [subjects, setSubjects] = useState<ScoreSubject[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(score?.values.map((item) => item.subject_id) ?? []);
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries((score?.values ?? []).map((item) => [item.subject_id, String(item.value)])));
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [remark, setRemark] = useState(score?.remark ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void api<{ subjects: ScoreSubject[] }>('/score-subjects').then(({ subjects: loaded }) => {
      if (!active) return;
      setSubjects(loaded);
      setSelectedIds((current) => [...new Set([...loaded.filter((item) => item.is_default === 1).map((item) => item.id), ...current])]);
    }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : '科目加载失败'); });
    return () => { active = false; };
  }, []);

  const selectedSubjects = useMemo(() => selectedIds.map((id) => subjects.find((item) => item.id === id)).filter((item): item is ScoreSubject => Boolean(item)), [selectedIds, subjects]);
  function selectSubject(subject: ScoreSubject) {
    setSelectedIds((current) => current.includes(subject.id) ? current : [...current, subject.id]);
    setNewSubjectName(''); setShowSubjectPicker(false);
  }
  async function addSubject() {
    const name = newSubjectName.trim();
    if (!name) { setFields((current) => ({ ...current, new_subject: '请输入科目名称' })); return; }
    const existing = subjects.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existing) { selectSubject(existing); return; }
    setAddingSubject(true); setError('');
    try {
      const result = await api<{ subject: ScoreSubject }>('/score-subjects', { method: 'POST', body: jsonBody({ name }) });
      setSubjects((current) => [...current, result.subject]); selectSubject(result.subject);
    } catch (caught) { setError(caught instanceof ApiClientError ? caught.message : '新增科目失败，请稍后重试'); }
    finally { setAddingSubject(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = { exam_name: examName, exam_date: examDate, remark, values: selectedSubjects.flatMap((subject) => values[subject.id] === undefined || values[subject.id] === '' ? [] : [{ subject_id: subject.id, value: Number(values[subject.id]) }]) };
    const parsed = scoreInputSchema.safeParse(input);
    if (!parsed.success) { const next: Record<string, string> = {}; for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message; setFields(next); return; }
    setSaving(true); setFields({}); setError('');
    try {
      const result = await api<{ score: Score }>(score ? `/scores/${score.id}` : `/students/${studentId}/scores`, { method: score ? 'PUT' : 'POST', body: jsonBody(parsed.data) });
      onSaved(result.score);
    } catch (caught) {
      if (caught instanceof ApiClientError) { setError(caught.message); setFields(caught.fields ?? {}); } else setError('保存成绩失败，请稍后重试');
    } finally { setSaving(false); }
  }
  return <form className="record-form" onSubmit={submit} noValidate>
    <div className="form-grid">
      <label className="field"><span>考试名称 <b>*</b></span><input aria-label="考试名称" value={examName} onChange={(event) => setExamName(event.target.value)} />{fields.exam_name && <small>{fields.exam_name}</small>}</label>
      <label className="field"><span>考试日期 <b>*</b></span><input aria-label="考试日期" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />{fields.exam_date && <small>{fields.exam_date}</small>}</label>
    </div>
    <div className="subject-inputs">{selectedSubjects.map((subject) => <label className="field" key={subject.id}><span>{subject.name}</span><input aria-label={subject.name} type="number" min="0" max="150" step="0.5" placeholder="未填写不显示" value={values[subject.id] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [subject.id]: event.target.value }))} /></label>)}</div>
    <div className="subject-picker">
      <button className="button button-secondary button-compact" type="button" onClick={() => setShowSubjectPicker((current) => !current)}>添加科目</button>
      {showSubjectPicker && <div className="subject-picker-panel">
        <label className="field"><span>新科目名称</span><input aria-label="新科目名称" value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} />{fields.new_subject && <small>{fields.new_subject}</small>}</label>
        <button className="button button-primary button-compact" type="button" disabled={addingSubject} onClick={() => void addSubject()}>{addingSubject ? '正在添加…' : '确认添加科目'}</button>
        {subjects.some((item) => !selectedIds.includes(item.id)) && <div className="subject-suggestions" aria-label="已有科目">{subjects.filter((item) => !selectedIds.includes(item.id)).map((item) => <button type="button" key={item.id} onClick={() => selectSubject(item)}>{item.name}</button>)}</div>}
      </div>}
    </div>
    <label className="field"><span>备注</span><textarea aria-label="备注" rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} />{fields.remark && <small>{fields.remark}</small>}</label>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <div className="form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : score ? '保存修改' : '保存成绩'}</button></div>
  </form>;
}
