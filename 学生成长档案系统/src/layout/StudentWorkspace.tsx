import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import type { StudentArchive } from '../../shared/contracts';
import { api, ApiClientError } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { StudentForm } from '../features/students/StudentForm';
import { ArchivePaper } from './ArchiveLayout';
import { useArchive } from './ArchiveContext';
import { StudentHeader } from './StudentHeader';
import { buildArchiveDocx } from '../features/export/archiveDocx';

export function StudentWorkspace() {
  const { studentId } = useParams();
  const { students, tags, refresh } = useArchive();
  const navigate = useNavigate();
  const location = useLocation();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const student = students.find((item) => item.id === Number(studentId));
  const studentIndex = students.findIndex((item) => item.id === Number(studentId));
  if (!student && students.length > 0) return <Navigate to="/" replace />;
  if (!student) return <div className="page-loading">正在打开学生档案…</div>;

  async function removeStudent() {
    setDeleting(true);
    setError('');
    try {
      await api<void>(`/students/${student!.id}`, { method: 'DELETE' });
      await refresh();
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : '删除学生失败');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  function switchStudent(offset: number) {
    const target = students[studentIndex + offset];
    if (!target) return;
    const suffix = location.pathname.replace(`/students/${student!.id}`, '');
    navigate(`/students/${target.id}${suffix}`);
  }

  async function exportArchive() {
    setExporting(true); setError('');
    try {
      const [archive, logoResponse] = await Promise.all([api<StudentArchive>(`/students/${student!.id}/archive`), fetch('/brand/innovation-academy-logo.jpg')]);
      if (!logoResponse.ok) throw new Error('品牌图片加载失败');
      const blob = await buildArchiveDocx(archive, new Uint8Array(await logoResponse.arrayBuffer()));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${student!.name}-学生成长档案.docx`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (caught) { setError(caught instanceof Error ? `Word 导出失败：${caught.message}` : 'Word 导出失败'); }
    finally { setExporting(false); }
  }

  return (
    <>
      <ArchivePaper>
        <StudentHeader student={student} onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)} onPrevious={() => switchStudent(-1)} onNext={() => switchStudent(1)} previousDisabled={studentIndex <= 0} nextDisabled={studentIndex < 0 || studentIndex >= students.length - 1} exporting={exporting} onExport={() => void exportArchive()} />
        {error && <div className="banner-error" role="alert">{error}</div>}
        <Outlet context={{ student }} />
      </ArchivePaper>
      {editing && (
        <Modal title="编辑学生资料" onClose={() => setEditing(false)} wide>
          <StudentForm student={student} tags={tags} onCancel={() => setEditing(false)} onSaved={() => {
            setEditing(false);
            void refresh();
          }} />
        </Modal>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="删除学生档案"
          message={`确认删除 ${student.name} 的全部档案吗？成绩、晚辅和课程记录将同时删除，且无法恢复。`}
          confirmLabel="确认删除学生"
          busy={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void removeStudent()}
        />
      )}
    </>
  );
}
