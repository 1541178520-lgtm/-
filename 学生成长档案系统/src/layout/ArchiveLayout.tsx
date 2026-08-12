import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import type { Student, Tag } from '../../shared/contracts';
import { api, ApiClientError } from '../api/client';
import { useAuth } from '../auth/context';
import { ArchiveContext } from './ArchiveContext';
import { StudentDirectory } from './StudentDirectory';
import { Modal } from '../components/Modal';
import { StudentForm } from '../features/students/StudentForm';
import { TagManager } from '../features/tags/TagManager';

async function loadDirectory(): Promise<{ students: Student[]; tags: Tag[] }> {
  const [studentResult, tagResult] = await Promise.all([
    api<{ students: Student[] }>('/students'),
    api<{ tags: Tag[] }>('/tags'),
  ]);
  return { students: studentResult.students, tags: tagResult.tags };
}

export function ArchiveLayout() {
  const { admin, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createRequested, setCreateRequested] = useState(false);
  const [manageTags, setManageTags] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const match = location.pathname.match(/^\/students\/(\d+)/u);
  const selectedStudentId = match ? Number(match[1]) : null;

  const refresh = useCallback(async () => {
    try {
      const result = await loadDirectory();
      setStudents(result.students);
      setTags(result.tags);
      setError('');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) await logout();
      else setError(caught instanceof Error ? caught.message : '档案目录加载失败');
    }
  }, [logout]);

  useEffect(() => {
    let active = true;
    void loadDirectory().then((result) => {
      if (!active) return;
      setStudents(result.students);
      setTags(result.tags);
      setError('');
    }).catch((caught: unknown) => {
      if (!active) return;
      if (caught instanceof ApiClientError && caught.status === 401) void logout();
      else setError(caught instanceof Error ? caught.message : '档案目录加载失败');
    });
    return () => { active = false; };
  }, [logout]);
  const context = useMemo(() => ({ students, tags, refresh, openCreateStudent: () => setCreateRequested(true) }), [students, tags, refresh]);

  async function exportBackup() {
    if (!window.archiveDesktop) return;
    setBackupBusy(true);
    setError('');
    try {
      const result = await window.archiveDesktop.exportBackup();
      if (!result.canceled) setError(result.message ?? '数据备份已导出');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '导出数据备份失败');
    } finally {
      setBackupBusy(false);
    }
  }

  async function importBackup() {
    if (!window.archiveDesktop) return;
    if (!confirm('导入备份会覆盖当前电脑里的学生档案数据，确认继续吗？')) return;
    setBackupBusy(true);
    setError('');
    try {
      const result = await window.archiveDesktop.importBackup();
      if (!result.canceled) {
        await refresh();
        navigate('/', { replace: true });
        setError(result.message ?? '数据备份已导入');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '导入数据备份失败');
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <ArchiveContext.Provider value={context}>
      <div className="archive-app">
        <StudentDirectory students={students} selectedStudentId={selectedStudentId} onAdd={() => setCreateRequested(true)} onManageTags={() => setManageTags(true)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        {mobileOpen && <button className="directory-backdrop mobile-only" type="button" aria-label="关闭学生目录" onClick={() => setMobileOpen(false)} />}
        <main className="archive-main">
          <div className="topbar no-print">
            <button className="button button-secondary mobile-only" type="button" onClick={() => setMobileOpen(true)}>学生目录</button>
            <span className="topbar-spacer" />
            {window.archiveDesktop && <button className="text-button" type="button" disabled={backupBusy} onClick={() => void exportBackup()}>导出数据备份</button>}
            {window.archiveDesktop && <button className="text-button" type="button" disabled={backupBusy} onClick={() => void importBackup()}>导入数据备份</button>}
            <span className="admin-name">{admin?.username}</span>
            <button className="text-button" type="button" onClick={() => void logout()}>退出登录</button>
          </div>
          {error && <div className="banner-error" role="alert">{error}<button type="button" onClick={() => void refresh()}>重试</button></div>}
          <Outlet />
        </main>
        {createRequested && (
          <Modal title="新增学生" onClose={() => setCreateRequested(false)} wide>
            <StudentForm tags={tags} onCancel={() => setCreateRequested(false)} onSaved={(student) => {
              setCreateRequested(false);
              void refresh().then(() => navigate(`/students/${student.id}/scores`));
            }} />
          </Modal>
        )}
        {manageTags && (
          <Modal title="学生标签管理" onClose={() => setManageTags(false)} wide>
            <TagManager tags={tags} onClose={() => setManageTags(false)} onChanged={(next) => {
              setTags(next);
              void refresh();
            }} />
          </Modal>
        )}
      </div>
    </ArchiveContext.Provider>
  );
}

export function ArchivePaper({ children }: { children: ReactNode }) {
  return <article className="archive-paper">{children}</article>;
}
