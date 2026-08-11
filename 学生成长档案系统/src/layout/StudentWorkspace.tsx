import { Navigate, Outlet, useParams } from 'react-router';
import { ArchivePaper } from './ArchiveLayout';
import { useArchive } from './ArchiveContext';
import { StudentHeader } from './StudentHeader';

export function StudentWorkspace() {
  const { studentId } = useParams();
  const { students } = useArchive();
  const student = students.find((item) => item.id === Number(studentId));
  if (!student && students.length > 0) return <Navigate to="/" replace />;
  if (!student) return <div className="page-loading">正在打开学生档案…</div>;
  return (
    <ArchivePaper>
      <StudentHeader student={student} />
      <Outlet context={{ student }} />
    </ArchivePaper>
  );
}
