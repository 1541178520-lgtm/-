PRAGMA foreign_keys = ON;

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(username)) BETWEEN 3 AND 64),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_sessions_admin ON sessions(admin_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  grade TEXT NOT NULL CHECK (length(trim(grade)) BETWEEN 1 AND 40),
  school TEXT NOT NULL DEFAULT '' CHECK (length(school) <= 120),
  join_date TEXT CHECK (join_date IS NULL OR join_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  remark TEXT NOT NULL DEFAULT '' CHECK (length(remark) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_students_grade_name ON students(grade, name, id);
CREATE INDEX idx_students_name ON students(name);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 30),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE student_tags (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (student_id, tag_id)
);

CREATE INDEX idx_student_tags_tag ON student_tags(tag_id, student_id);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL CHECK (length(trim(exam_name)) BETWEEN 1 AND 120),
  exam_date TEXT NOT NULL CHECK (exam_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  chinese REAL CHECK (chinese IS NULL OR chinese BETWEEN 0 AND 150),
  math REAL CHECK (math IS NULL OR math BETWEEN 0 AND 150),
  english REAL CHECK (english IS NULL OR english BETWEEN 0 AND 150),
  physics REAL CHECK (physics IS NULL OR physics BETWEEN 0 AND 150),
  chemistry REAL CHECK (chemistry IS NULL OR chemistry BETWEEN 0 AND 150),
  remark TEXT NOT NULL DEFAULT '' CHECK (length(remark) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_scores_student_date ON scores(student_id, exam_date, created_at, id);

CREATE TABLE study_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  record_date TEXT NOT NULL CHECK (record_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 20000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_study_records_student_date ON study_records(student_id, record_date, created_at, id);

CREATE TABLE course_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('语文', '数学', '英语', '物理', '化学', '自然拼读', '剑桥')),
  record_date TEXT NOT NULL CHECK (record_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  course_content TEXT NOT NULL DEFAULT '' CHECK (length(course_content) <= 500),
  feedback TEXT NOT NULL CHECK (length(trim(feedback)) BETWEEN 1 AND 20000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_course_records_student_subject_date
  ON course_records(student_id, subject, record_date, created_at, id);
