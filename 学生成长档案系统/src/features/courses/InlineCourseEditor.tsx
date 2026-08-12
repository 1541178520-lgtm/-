import type { CourseRecord } from '../../../shared/contracts';
import { courseRecordInputSchema } from '../../../shared/validation';
import { api, jsonBody } from '../../api/client';
import { useAutosaveDraft } from '../../hooks/useAutosaveDraft';

export function InlineCourseEditor({ record, onSaved }: { record: CourseRecord; onSaved: (record: CourseRecord) => void }) {
  const autosave = useAutosaveDraft({ initial: record, save: async (draft) => {
    const input = courseRecordInputSchema.parse({ subject: draft.subject, record_date: draft.record_date, course_content: draft.course_content, feedback: draft.feedback });
    const result = await api<{ record: CourseRecord }>(`/course-records/${record.id}`, { method: 'PUT', body: jsonBody(input) });
    onSaved(result.record); return result.record;
  }});
  const shortcut = (event: React.KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void autosave.saveNow(); } };
  return <div className="inline-editor" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) void autosave.saveNow(); }} onKeyDown={shortcut}>
    <label className="inline-date"><span>日期</span><input aria-label="日期" type="date" value={autosave.draft.record_date} onChange={(event) => autosave.update({ ...autosave.draft, record_date: event.target.value })} /></label>
    <label className="inline-topic"><span>本课内容</span><input aria-label="课程内容" value={autosave.draft.course_content} onChange={(event) => autosave.update({ ...autosave.draft, course_content: event.target.value })} placeholder="点击填写本课内容" /></label>
    <label className="inline-copy"><span className="sr-only">教师反馈</span><textarea aria-label="教师反馈" value={autosave.draft.feedback} onChange={(event) => autosave.update({ ...autosave.draft, feedback: event.target.value })} /></label>
    <div className={`autosave-status ${autosave.status}`} role="status">{autosave.message}</div>
  </div>;
}
