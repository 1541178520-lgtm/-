import { useState, type FormEvent } from 'react';
import type { Score } from '../../../shared/contracts';
import { scoreInputSchema } from '../../../shared/validation';
import { api, ApiClientError, jsonBody } from '../../api/client';

interface Props {
  studentId: number;
  score?: Score;
  onSaved: (score: Score) => void;
  onCancel: () => void;
}

const today = () => new Date().toLocaleDateString('en-CA');

export function ScoreForm({ studentId, score, onSaved, onCancel }: Props) {
  const [examName, setExamName] = useState(score?.exam_name ?? '');
  const [examDate, setExamDate] = useState(score?.exam_date ?? today());
  const [values, setValues] = useState<Record<'chinese' | 'math' | 'english' | 'physics' | 'chemistry', string>>({
    chinese: score?.chinese === null || score?.chinese === undefined ? '' : String(score.chinese),
    math: score?.math === null || score?.math === undefined ? '' : String(score.math),
    english: score?.english === null || score?.english === undefined ? '' : String(score.english),
    physics: score?.physics === null || score?.physics === undefined ? '' : String(score.physics),
    chemistry: score?.chemistry === null || score?.chemistry === undefined ? '' : String(score.chemistry),
  });
  const [remark, setRemark] = useState(score?.remark ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setSubject(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      exam_name: examName,
      exam_date: examDate,
      chinese: values.chinese === '' ? null : Number(values.chinese),
      math: values.math === '' ? null : Number(values.math),
      english: values.english === '' ? null : Number(values.english),
      physics: values.physics === '' ? null : Number(values.physics),
      chemistry: values.chemistry === '' ? null : Number(values.chemistry),
      remark,
    };
    const parsed = scoreInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message;
      setFields(next);
      return;
    }
    setSaving(true); setFields({}); setError('');
    try {
      const result = await api<{ score: Score }>(score ? `/scores/${score.id}` : `/students/${studentId}/scores`, {
        method: score ? 'PUT' : 'POST', body: jsonBody(parsed.data),
      });
      onSaved(result.score);
    } catch (caught) {
      if (caught instanceof ApiClientError) { setError(caught.message); setFields(caught.fields ?? {}); }
      else setError('保存成绩失败，请稍后重试');
    } finally { setSaving(false); }
  }

  const subjectFields: Array<[keyof typeof values, string]> = [['chinese', '语文'], ['math', '数学'], ['english', '英语'], ['physics', '物理'], ['chemistry', '化学']];
  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <label className="field"><span>考试名称 <b>*</b></span><input aria-label="考试名称" value={examName} onChange={(event) => setExamName(event.target.value)} />{fields.exam_name && <small>{fields.exam_name}</small>}</label>
        <label className="field"><span>考试日期 <b>*</b></span><input aria-label="考试日期" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />{fields.exam_date && <small>{fields.exam_date}</small>}</label>
      </div>
      <div className="subject-inputs">
        {subjectFields.map(([key, label]) => <label className="field" key={key}><span>{label}</span><input aria-label={label} type="number" min="0" max="150" step="0.5" placeholder="可留空" value={values[key]} onChange={(event) => setSubject(key, event.target.value)} />{fields[key] && <small>{fields[key]}</small>}</label>)}
      </div>
      <label className="field"><span>备注</span><textarea aria-label="备注" rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} />{fields.remark && <small>{fields.remark}</small>}</label>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : score ? '保存修改' : '保存成绩'}</button></div>
    </form>
  );
}
