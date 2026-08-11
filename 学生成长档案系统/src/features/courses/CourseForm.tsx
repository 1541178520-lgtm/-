import { useState, type FormEvent } from 'react';
import type { Subject } from '../../../shared/constants';
import type { CourseRecord } from '../../../shared/contracts';
import { courseRecordInputSchema } from '../../../shared/validation';
import { api, ApiClientError, jsonBody } from '../../api/client';

interface Props { studentId: number; subject: Subject; record?: CourseRecord; onSaved: (record: CourseRecord) => void; onCancel: () => void; }
const today = () => new Date().toLocaleDateString('en-CA');

export function CourseForm({ studentId, subject, record, onSaved, onCancel }: Props) {
  const [date, setDate] = useState(record?.record_date ?? today());
  const [content, setContent] = useState(record?.course_content ?? '');
  const [feedback, setFeedback] = useState(record?.feedback ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = courseRecordInputSchema.safeParse({ subject, record_date: date, course_content: content, feedback });
    if (!parsed.success) { const next: Record<string, string> = {}; for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message; setFields(next); return; }
    setSaving(true); setFields({}); setError('');
    try {
      const result = await api<{ record: CourseRecord }>(record ? `/course-records/${record.id}` : `/students/${studentId}/courses`, {
        method: record ? 'PUT' : 'POST', body: jsonBody(parsed.data),
      });
      onSaved(result.record);
    } catch (caught) {
      if (caught instanceof ApiClientError) { setError(caught.message); setFields(caught.fields ?? {}); }
      else setError('保存课程记录失败');
    } finally { setSaving(false); }
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="form-grid"><label className="field"><span>课程科目</span><input value={subject} disabled /></label><label className="field"><span>日期 <b>*</b></span><input aria-label="日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} />{fields.record_date && <small>{fields.record_date}</small>}</label></div>
      <label className="field"><span>课程内容</span><input aria-label="课程内容" placeholder="例如：一次函数综合题" value={content} onChange={(event) => setContent(event.target.value)} />{fields.course_content && <small>{fields.course_content}</small>}</label>
      <label className="field large-text-field"><span>教师反馈 <b>*</b></span><textarea aria-label="教师反馈" rows={11} placeholder="可直接粘贴整段课程反馈…" value={feedback} onChange={(event) => setFeedback(event.target.value)} />{fields.feedback && <small>{fields.feedback}</small>}</label>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : record ? '保存修改' : '保存课程记录'}</button></div>
    </form>
  );
}
