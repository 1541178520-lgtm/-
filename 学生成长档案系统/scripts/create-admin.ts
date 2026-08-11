const apiUrl = process.env.ARCHIVE_API_URL ?? 'http://localhost:5173';
const setupSecret = process.env.ARCHIVE_SETUP_SECRET;
const username = process.env.ARCHIVE_ADMIN_USERNAME;
const password = process.env.ARCHIVE_ADMIN_PASSWORD;

if (!setupSecret || !username || !password) {
  console.error('请设置 ARCHIVE_SETUP_SECRET、ARCHIVE_ADMIN_USERNAME 和 ARCHIVE_ADMIN_PASSWORD。');
  process.exit(1);
}

const response = await fetch(`${apiUrl}/api/setup/admin`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: new URL(apiUrl).origin,
    'x-setup-secret': setupSecret,
  },
  body: JSON.stringify({ username, password }),
});

if (!response.ok) {
  console.error(`初始化失败 (${response.status})：${await response.text()}`);
  process.exit(1);
}

console.log(`管理员 ${username} 已创建。`);

export {};
