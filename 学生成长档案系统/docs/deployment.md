# Cloudflare 部署手册

## 前置条件

1. 有可用的 Cloudflare 账号，并在本机完成 `npx wrangler login`。
2. 决定正式访问域名。可以先使用 `*.workers.dev`，正式使用建议绑定自有 HTTPS 域名。
3. 准备至少 32 位随机 `SETUP_SECRET` 和高强度管理员密码；不要提交到 Git。

当前仓库中的 D1 ID、`APP_ORIGIN` 和 Cookie 安全开关是本地开发值，不能原样用于生产。

## 1. 创建远程 D1

```powershell
npx wrangler d1 create student-growth-archive
```

把命令返回的 `database_id` 写入 `wrangler.production.jsonc` 的 `d1_databases[0].database_id`。本地 `wrangler.jsonc` 保持本地配置，不要改成生产数据库。

## 2. 配置正式来源和 Cookie

在 `wrangler.production.jsonc` 中把：

```json
"APP_ORIGIN": "https://你的正式域名",
"SESSION_COOKIE_SECURE": "true"
```

`APP_ORIGIN` 必须与浏览器地址栏的协议和域名完全一致，末尾不要加 `/`。如果先部署到 workers.dev，可先完成第 4 步取得 URL，再更新该值并重新部署一次。

## 3. 应用远程迁移和设置秘密

```powershell
npx wrangler d1 migrations apply student-growth-archive --remote --config wrangler.production.jsonc
npx wrangler secret put SETUP_SECRET --config wrangler.production.jsonc
```

第二条命令会交互式要求输入秘密。不要把真实值写入 `wrangler.jsonc`、`.env` 或提交记录。

## 4. 构建并部署

```powershell
npm run deploy
```

确认 Wrangler 输出的正式 URL 与 `APP_ORIGIN` 一致；若不一致，修改配置并再次执行 `npm run deploy`。

## 5. 创建首个管理员

```powershell
$env:ARCHIVE_API_URL='https://你的正式域名'
$env:ARCHIVE_SETUP_SECRET='刚才写入Cloudflare的秘密'
$env:ARCHIVE_ADMIN_USERNAME='archive-admin'
$env:ARCHIVE_ADMIN_PASSWORD='替换为高强度密码'
npm run admin:create
```

创建后立即登录验证。V1 只允许通过初始化接口创建第一个管理员；接口检测到已有管理员后会永久拒绝重复初始化。验证成功后删除初始化密钥，关闭不再需要的初始化凭据：

```powershell
npx wrangler secret delete SETUP_SECRET --config wrangler.production.jsonc
```

## 6. 上线验收

- 登录后新增一名临时学生，验证刷新后数据仍存在，再删除该学生。
- 验证成绩、晚辅和课程新增、编辑、删除。
- 打开打印档案，检查打印预览为 A4，操作栏不进入打印稿。
- 退出登录，确认档案页面跳转登录页，直接请求 `/api/students` 返回 401。
- 在 Cloudflare 控制台确认 Worker 无持续错误，D1 绑定指向正式数据库。

## 备份与变更

- D1 结构变更只新增迁移文件，不修改已经部署过的迁移。
- 上线前使用 Cloudflare 提供的 D1 导出/备份能力保留数据副本。
- 删除学生会级联删除其成绩、晚辅、课程和标签关联，属于不可恢复操作；界面已要求二次确认。
- 不要在生产环境运行 `scripts/reset-e2e.mjs` 或 `npm run e2e:serve`。

## 当前生产环境

- Worker：`student-growth-archive`
- 地址：`https://student-growth-archive.chuangxin-xueyuan.workers.dev`
- D1：`student-growth-archive`
- 正式环境使用独立的 `wrangler.production.jsonc`，不会连接本地测试数据库。
