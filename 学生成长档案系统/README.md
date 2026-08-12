# 学生成长档案系统

面向教培机构内部使用的学生长期成长档案。系统以“学生”为主线，集中管理基本资料、标签、考试成绩、晚辅记录和七类课程记录，并能一键导出排版完整的 Word 档案。

## 已实现功能

- 管理员登录、退出和服务端会话；未登录不能读取或修改档案。
- 学生新增、编辑、删除，按年级分组，并支持中文姓名即时搜索。
- 标签新增、重命名、删除及学生多标签绑定。
- 成绩时间轴：内置常用科目，也可新增并复用自定义科目；未填写科目不显示。
- 晚辅电子笔记：已有记录直接点击编辑，停顿 800ms、失焦或 `Ctrl+Enter` 自动保存。
- 课程电子笔记：七类课程隔离管理，已有记录直接编辑并自动保存。
- Word 整档导出：带创新学苑 Logo、封面、动态成绩表、晚辅和有数据的课程章节，自动分页并带页眉页码。
- 学生档案顶部可直接切换上一位/下一位学生，适合老师连续录入。
- 桌面、平板和手机响应式界面，手机端使用抽屉式学生目录。

## 技术结构

- React 19、TypeScript、Vite、Tailwind CSS 4
- Cloudflare Worker、Hono、D1
- Vitest、Cloudflare Workers 测试池、Testing Library、Playwright

前端和 API 由同一个 Worker 同源提供，避免额外的跨域和 Cookie 配置。管理员密码使用 PBKDF2-SHA256 加盐哈希；浏览器仅保存 HttpOnly 会话 Cookie，数据库只保存会话令牌哈希。

## 本地启动

需要 Node.js 22 或更高版本。

## Windows 单机版

本项目支持打包为不依赖网络的 Windows 桌面版。桌面版会把数据保存在当前 Windows 用户的应用数据目录中，断网也可以新增学生、记录成绩、记录晚辅/课程并导出 Word 档案。

桌面版默认本机登录账号：

```text
用户名：archive-admin
密码：archive-admin
```

开发和打包命令：

```powershell
npm install
npm run test:desktop
npm run desktop:pack
```

打包完成后，Windows 可执行文件会输出到 `release/` 目录。桌面版先满足机构内部单机录入使用；未来如果要做家长查询、网页端或小程序，可以继续复用当前前端和业务数据结构，再新增云端同步能力。

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
