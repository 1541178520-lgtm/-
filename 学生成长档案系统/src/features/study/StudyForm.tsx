import { useState, type FormEvent } from 'react';
import type { StudyRecord } from '../../../shared/contracts';
import { studyRecordInputSchema } from '../../../shared/validation';
import { api, ApiClientError, jsonBody } from '../../api/client';

interface Props { studentId: number; record?: StudyRecord; onSaved: (record: StudyRecord) => void; onCancel: () => void; }
const today = () => new Date().toLocaleDateString('en-CA');

export function StudyForm({ studentId, record, onSaved, onCancel }: Props) {
  const [date, setDate] = useState(record?.record_date ?? today());
  const [content, setContent] = useState(record?.content ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = studyRecordInputSchema.safeParse({ record_date: date, content });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message;
      setFields(next); return;
    }
    setSaving(true); setFields({}); setError('');
    try {
      const result = await api<{ record: StudyRecord }>(record ? `/study-records/${record.id}` : `/students/${studentId}/study-records`, {
        method: record ? 'PUT' : 'POST', body: jsonBody(parsed.data),
      });
      onSaved(result.record);
    } catch (caught) {
      if (caught instanceof ApiClientError) { setError(caught.message); setFields(caught.fields ?? {}); }
      else setError('保存晚辅记录失败');
    } finally { setSaving(false); }
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <label className="field"><span>记录日期 <b>*</b></span><input aria-label="记录日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} />{fields.record_date && <small>{fields.record_date}</small>}</label>
      <label className="field large-text-field"><span>晚辅反馈 <b>*</b></span><textarea aria-label="晚辅反馈" rows={12} placeholder="可直接粘贴整段反馈…" value={content} onChange={(event) => setContent(event.target.value)} />{fields.content && <small>{fields.content}</small>}</label>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : record ? '保存修改' : '保存晚辅记录'}</button></div>
    </form>
  );
}
