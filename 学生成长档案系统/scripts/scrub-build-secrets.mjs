import { existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerOutput = resolve(root, 'dist', 'student_growth_archive');
const localSecrets = resolve(workerOutput, '.dev.vars');

if (!localSecrets.startsWith(`${workerOutput}\\`) && !localSecrets.startsWith(`${workerOutput}/`)) {
  throw new Error('拒绝清理预期构建目录以外的文件');
}

if (existsSync(localSecrets)) {
  unlinkSync(localSecrets);
  if (existsSync(localSecrets)) throw new Error('本地 .dev.vars 清理失败');
  console.log('已从构建产物中移除本地 .dev.vars。');
}
