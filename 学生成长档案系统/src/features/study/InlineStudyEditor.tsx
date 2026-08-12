import type { StudyRecord } from '../../../shared/contracts';
import { studyRecordInputSchema } from '../../../shared/validation';
import { api, jsonBody } from '../../api/client';
import { useAutosaveDraft } from '../../hooks/useAutosaveDraft';

export function InlineStudyEditor({ record, onSaved }: { record: StudyRecord; onSaved: (record: StudyRecord) => void }) {
  const autosave = useAutosaveDraft({ initial: record, save: async (draft) => {
    const input = studyRecordInputSchema.parse({ record_date: draft.record_date, content: draft.content });
    const result = await api<{ record: StudyRecord }>(`/study-records/${record.id}`, { method: 'PUT', body: jsonBody(input) });
    onSaved(result.record); return result.record;
  }});
  const shortcut = (event: React.KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void autosave.saveNow(); } };
  return <div className="inline-editor" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) void autosave.saveNow(); }} onKeyDown={shortcut}>
    <label className="inline-date"><span>记录日期</span><input aria-label="记录日期" type="date" value={autosave.draft.record_date} onChange={(event) => autosave.update({ ...autosave.draft, record_date: event.target.value })} /></label>
    <label className="inline-copy"><span className="sr-only">晚辅反馈</span><textarea aria-label="晚辅反馈" value={autosave.draft.content} onChange={(event) => autosave.update({ ...autosave.draft, content: event.target.value })} /></label>
    <div className={`autosave-status ${autosave.status}`} role="status">{autosave.message}</div>
  </div>;
}
