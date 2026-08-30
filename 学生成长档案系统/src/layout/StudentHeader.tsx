import { NavLink } from 'react-router';
import type { Student } from '../../shared/contracts';
import { AttendanceCalendar } from '../features/attendance/AttendanceCalendar';

interface Props {
  student: Student;
  onEdit: () => void;
  onDelete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onExport: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  exporting: boolean;
}

export function StudentHeader({ student, onEdit, onDelete, onPrevious, onNext, onExport, previousDisabled, nextDisabled, exporting }: Props) {
  return (
    <header className="student-header">
      <div className="student-title-row">
        <div>
          <p className="eyebrow">学生成长档案</p>
          <h2>{student.name}</h2>
          <div className="student-meta">
            <span>{student.grade}</span>
            {student.school && <span>{student.school}</span>}
            {student.join_date && <span>入学 {student.join_date}</span>}
          </div>
          {student.tags.length > 0 && <div className="tag-row">{student.tags.map((tag) => <span className="tag" key={tag.id}>{tag.name}</span>)}</div>}
        </div>
        <div className="student-actions no-print">
          <button className="student-switch" type="button" aria-label="上一位学生" title="上一位学生" disabled={previousDisabled} onClick={onPrevious}>‹</button>
          <button className="student-switch" type="button" aria-label="下一位学生" title="下一位学生" disabled={nextDisabled} onClick={onNext}>›</button>
          <button className="button button-secondary" type="button" onClick={onEdit}>编辑资料</button>
          <button className="button button-quiet-danger" type="button" onClick={onDelete}>删除学生</button>
          <button className="button button-primary" type="button" disabled={exporting} onClick={onExport}>{exporting ? '正在生成 Word…' : '导出 Word 档案'}</button>
        </div>
      </div>
      <AttendanceCalendar studentId={student.id} />
      <nav className="archive-tabs" aria-label="档案章节">
        <NavLink to={`/students/${student.id}/scores`}>成绩记录</NavLink>
        <NavLink to={`/students/${student.id}/study`}>晚辅</NavLink>
        <NavLink to={`/students/${student.id}/courses`}>课程</NavLink>
      </nav>
    </header>
  );
}
