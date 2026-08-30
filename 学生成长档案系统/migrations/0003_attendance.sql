CREATE TABLE attendance_records (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date TEXT NOT NULL CHECK (attendance_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (student_id, attendance_date)
);

CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, attendance_date);
