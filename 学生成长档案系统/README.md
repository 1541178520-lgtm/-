# 学生成长档案系统

面向教培机构内部使用的学生长期成长档案。系统以“学生”为主线，集中管理基本资料、标签、考试成绩、晚辅记录和七类课程记录，并能排版为 A4 档案后通过浏览器打印或另存为 PDF。

## 已实现功能

- 管理员登录、退出和服务端会话；未登录不能读取或修改档案。
- 学生新增、编辑、删除，按年级分组，并支持中文姓名即时搜索。
- 标签新增、重命名、删除及学生多标签绑定。
- 成绩时间轴：语文、数学、英语、物理、化学可留空，支持增删改和日期排序。
- 晚辅电子笔记：一条记录一页，按日期翻页，编辑日期后自动重排。
- 课程电子笔记：语文、数学、英语、物理、化学、自然拼读、剑桥七科隔离管理。
- 独立 A4 打印档案：封面、成绩、晚辅及有数据的课程章节；操作按钮不会进入打印稿。
- 桌面、平板和手机响应式界面，手机端使用抽屉式学生目录。

## 技术结构

- React 19、TypeScript、Vite、Tailwind CSS 4
- Cloudflare Worker、Hono、D1
- Vitest、Cloudflare Workers 测试池、Testing Library、Playwright

前端和 API 由同一个 Worker 同源提供，避免额外的跨域和 Cookie 配置。管理员密码使用 PBKDF2-SHA256 加盐哈希；浏览器仅保存 HttpOnly 会话 Cookie，数据库只保存会话令牌哈希。

## 本地启动

需要 Node.js 22 或更高版本。

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
```

把 `.dev.vars` 中的 `SETUP_SECRET` 改为至少 32 位随机字符串，然后初始化本地数据库：

```powershell
npx wrangler d1 migrations apply student-growth-archive --local
npm run dev
```

保持开发服务器运行，在另一个 PowerShell 窗口创建唯一的初始管理员：

```powershell
$env:ARCHIVE_API_URL='http://localhost:5173'
$env:ARCHIVE_SETUP_SECRET='与.dev.vars相同的值'
$env:ARCHIVE_ADMIN_USERNAME='archive-admin'
$env:ARCHIVE_ADMIN_PASSWORD='替换为高强度密码'
npm run admin:create
```

打开 `http://localhost:5173` 登录。初始化接口在首个管理员创建后会拒绝再次创建，返回 `409 ADMIN_EXISTS`。

## 开发命令

```powershell
npm run typecheck   # 前端和 Worker 类型检查
npm run lint        # ESLint，零 warning 门禁
npm test            # Worker API 与 React UI 测试
npm run test:e2e    # 重置本地 D1 后执行完整 Chromium 验收
npm run build       # 生产构建
```

`npm run test:e2e` 会覆盖本机 `.dev.vars` 并清空本地 Wrangler D1 中的测试数据，只用于开发环境，绝不能指向远程数据库。

Cloudflare Vite 插件会为本地 `vite preview` 临时生成一份构建目录内的 `.dev.vars`；本项目的生产构建脚本会在构建结束时自动删除该文件，防止本地秘密滞留在待部署目录。正式秘密只通过 `wrangler secret put` 管理。

生产部署步骤见 [docs/deployment.md](docs/deployment.md)，完整验收覆盖见 [docs/acceptance-matrix.md](docs/acceptance-matrix.md)。
