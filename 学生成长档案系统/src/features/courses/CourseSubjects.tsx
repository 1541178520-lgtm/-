import { NavLink } from 'react-router';
import { SUBJECTS, type Subject } from '../../../shared/constants';

export function CourseSubjects({ studentId, active }: { studentId: number; active?: Subject }) {
  return (
    <nav className="subject-tabs" aria-label="课程科目">
      {SUBJECTS.map((subject) => <NavLink key={subject} className={active === subject ? 'active' : ''} to={`/students/${studentId}/courses/${encodeURIComponent(subject)}`}>{subject}</NavLink>)}
    </nav>
  );
}
