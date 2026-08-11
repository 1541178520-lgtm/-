import { useState, type FormEvent } from 'react';
import type { Student, Tag } from '../../../shared/contracts';
import { studentInputSchema } from '../../../shared/validation';
import { api, ApiClientError, jsonBody } from '../../api/client';
import { StudentTagsEditor } from '../tags/StudentTagsEditor';

interface Props {
  student?: Student;
  tags: Tag[];
  onSaved: (student: Student) => void;
  onCancel: () => void;
}

export function StudentForm({ student, tags, onSaved, onCancel }: Props) {
  const [name, setName] = useState(student?.name ?? '');
  const [grade, setGrade] = useState(student?.grade ?? '');
  const [school, setSchool] = useState(student?.school ?? '');
  const [joinDate, setJoinDate] = useState(student?.join_date ?? '');
  const [remark, setRemark] = useState(student?.remark ?? '');
  const [tagIds, setTagIds] = useState(student?.tags.map((tag) => tag.id) ?? []);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const input = { name, grade, school, join_date: joinDate, remark };
    const parsed = studentInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join('.')] ??= issue.message;
      setFields(next);
      return;
    }

    setSaving(true);
    setFields({});
    setError('');
    try {
      const result = await api<{ student: Student }>(student ? `/students/${student.id}` : '/students', {
        method: student ? 'PUT' : 'POST',
        body: jsonBody(parsed.data),
      });
      const tagged = await api<{ student: Student }>(`/students/${result.student.id}/tags`, {
        method: 'PUT',
        body: jsonBody({ tag_ids: tagIds }),
      });
      onSaved(tagged.student);
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <label className="field"><span>姓名 <b>*</b></span><input aria-label="姓名" value={name} onChange={(event) => setName(event.target.value)} />{fields.name && <small>{fields.name}</small>}</label>
        <label className="field"><span>年级 <b>*</b></span><input aria-label="年级" placeholder="例如：初一" value={grade} onChange={(event) => setGrade(event.target.value)} />{fields.grade && <small>{fields.grade}</small>}</label>
        <label className="field"><span>学校</span><input aria-label="学校" value={school} onChange={(event) => setSchool(event.target.value)} />{fields.school && <small>{fields.school}</small>}</label>
        <label className="field"><span>入学日期</span><input aria-label="入学日期" type="date" value={joinDate} onChange={(event) => setJoinDate(event.target.value)} />{fields.join_date && <small>{fields.join_date}</small>}</label>
        <label className="field form-span"><span>备注</span><textarea aria-label="备注" rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} />{fields.remark && <small>{fields.remark}</small>}</label>
      </div>
      <StudentTagsEditor tags={tags} selected={tagIds} onChange={setTagIds} />
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}>取消</button>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? '正在保存…' : student ? '保存修改' : '保存学生'}</button>
      </div>
    </form>
  );
}
