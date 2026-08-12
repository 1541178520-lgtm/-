import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerCli = resolve(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wranglerCli, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

writeFileSync(resolve(root, '.dev.vars'), 'SETUP_SECRET=e2e-setup-secret\n', 'utf8');
mkdirSync(resolve(root, 'test-results', 'visual'), { recursive: true });

runWrangler(['d1', 'migrations', 'apply', 'student-growth-archive', '--local']);
runWrangler([
  'd1',
  'execute',
  'student-growth-archive',
  '--local',
  '--command',
  [
    'PRAGMA foreign_keys = ON',
    'DELETE FROM course_records',
    'DELETE FROM study_records',
    'DELETE FROM scores',
    'DELETE FROM score_subjects WHERE is_default = 0',
    'DELETE FROM student_tags',
    'DELETE FROM tags',
    'DELETE FROM students',
    'DELETE FROM sessions',
    'DELETE FROM admins',
    "DELETE FROM sqlite_sequence WHERE name IN ('course_records','study_records','scores','tags','students','sessions','admins')",
  ].join('; '),
]);
