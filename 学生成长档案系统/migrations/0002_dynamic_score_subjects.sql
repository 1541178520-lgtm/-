CREATE TABLE score_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 30),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO score_subjects (name, is_default) VALUES
  ('语文', 1),
  ('数学', 1),
  ('英语', 1),
  ('物理', 1),
  ('化学', 1);

CREATE TABLE score_values (
  score_id INTEGER NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES score_subjects(id) ON DELETE RESTRICT,
  value REAL NOT NULL CHECK (value BETWEEN 0 AND 150),
  PRIMARY KEY (score_id, subject_id)
);

CREATE INDEX idx_score_values_subject ON score_values(subject_id, score_id);

INSERT INTO score_values (score_id, subject_id, value)
SELECT scores.id, score_subjects.id, scores.chinese
FROM scores JOIN score_subjects ON score_subjects.name = '语文'
WHERE scores.chinese IS NOT NULL;

INSERT INTO score_values (score_id, subject_id, value)
SELECT scores.id, score_subjects.id, scores.math
FROM scores JOIN score_subjects ON score_subjects.name = '数学'
WHERE scores.math IS NOT NULL;

INSERT INTO score_values (score_id, subject_id, value)
SELECT scores.id, score_subjects.id, scores.english
FROM scores JOIN score_subjects ON score_subjects.name = '英语'
WHERE scores.english IS NOT NULL;

INSERT INTO score_values (score_id, subject_id, value)
SELECT scores.id, score_subjects.id, scores.physics
FROM scores JOIN score_subjects ON score_subjects.name = '物理'
WHERE scores.physics IS NOT NULL;

INSERT INTO score_values (score_id, subject_id, value)
SELECT scores.id, score_subjects.id, scores.chemistry
FROM scores JOIN score_subjects ON score_subjects.name = '化学'
WHERE scores.chemistry IS NOT NULL;
