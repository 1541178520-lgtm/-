import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ArchiveLayout, ArchivePaper } from './layout/ArchiveLayout';
import { StudentWorkspace } from './layout/StudentWorkspace';
import { ScorePage } from './features/scores/ScorePage';

function Welcome() {
  return (
    <ArchivePaper>
      <section className="welcome-panel">
        <p className="eyebrow">成长档案室</p>
        <h2>请选择一名学生</h2>
        <p>从左侧目录查找学生，打开成绩、晚辅与课程记录。</p>
        <div className="book-mark" aria-hidden="true">成 长 有 迹</div>
      </section>
    </ArchivePaper>
  );
}

function ChapterPlaceholder({ title }: { title: string }) {
  return <section className="chapter-placeholder"><p>正在整理</p><h3>{title}</h3></section>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ArchiveLayout />}>
          <Route index element={<Welcome />} />
          <Route path="students/:studentId" element={<StudentWorkspace />}>
            <Route index element={<Navigate to="scores" replace />} />
            <Route path="scores" element={<ScorePage />} />
            <Route path="study" element={<ChapterPlaceholder title="晚辅成长记录" />} />
            <Route path="courses" element={<ChapterPlaceholder title="课程档案" />} />
          </Route>
          <Route path="students/:studentId/print" element={<ChapterPlaceholder title="打印档案" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
