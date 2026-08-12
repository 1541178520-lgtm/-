import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import type { Student } from '../../shared/contracts';

interface Props {
  students: Student[];
  selectedStudentId: number | null;
  onAdd: () => void;
  onManageTags?: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function StudentDirectory({ students, selectedStudentId, onAdd, onManageTags, mobileOpen = false, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const filtered = useMemo(
    () => students.filter((student) => student.name.includes(search.trim())),
    [search, students],
  );
  const groups = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const student of filtered) map.set(student.grade, [...(map.get(student.grade) ?? []), student]);
    return [...map.entries()];
  }, [filtered]);

  function toggleGrade(grade: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(grade)) next.delete(grade); else next.add(grade);
      return next;
    });
  }

  return (
    <aside className={`student-directory${mobileOpen ? ' is-open' : ''}`} aria-label="学生档案目录">
      <div className="directory-heading">
        <div className="directory-brand">
          <img src="/brand/innovation-academy-logo.jpg" alt="创新学苑教育" />
          <div>
            <p className="eyebrow">学生档案目录</p>
            <h1>成长档案</h1>
          </div>
        </div>
        {onClose && <button className="icon-button mobile-only" type="button" onClick={onClose} aria-label="关闭学生目录">×</button>}
      </div>
      <label className="search-field">
        <span className="sr-only">搜索学生</span>
        <span aria-hidden="true">⌕</span>
        <input type="search" aria-label="搜索学生" placeholder="搜索学生姓名" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <button className="button button-primary button-wide" type="button" onClick={onAdd}>＋ 新增学生</button>
      {onManageTags && <button className="directory-action" type="button" onClick={onManageTags}>管理学生标签</button>}
      <nav className="grade-groups" aria-label="按年级浏览学生">
        {groups.map(([grade, gradeStudents]) => {
          const isCollapsed = collapsed.has(grade) && !search;
          return (
            <section key={grade} className="grade-group" data-testid={`grade-${grade}`}>
              <button type="button" className="grade-toggle" onClick={() => toggleGrade(grade)} aria-expanded={!isCollapsed}>
                <span>{grade}</span><span className="grade-count">{gradeStudents.length}</span><span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
              </button>
              {!isCollapsed && (
                <ul>
                  {gradeStudents.map((student) => (
                    <li key={student.id}>
                      <NavLink
                        to={`/students/${student.id}/scores`}
                        className={student.id === selectedStudentId ? 'student-link active' : 'student-link'}
                        onClick={onClose}
                      >
                        <span className="student-name">{student.name}</span>
                        {student.tags[0] && <span className="mini-tag">{student.tags[0].name}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {groups.length === 0 && <p className="directory-empty">没有找到符合条件的学生</p>}
      </nav>
    </aside>
  );
}
