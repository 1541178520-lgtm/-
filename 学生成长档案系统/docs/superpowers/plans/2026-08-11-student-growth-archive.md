# 学生成长档案系统 V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可部署到 Cloudflare Workers + D1 的学生成长档案网站，完整实现管理员登录、学生和标签管理、成绩、晚辅、课程及 A4 打印，并通过自动化验收。

**Architecture:** Vite/React 单页应用与同仓库 Cloudflare Worker 组成一个部署单元；Worker 用 Hono 提供 `/api`，业务数据、密码摘要和会话保存在 D1。前端按功能拆分并通过同源 API 访问；打印使用独立 React 路由与原生打印样式。

**Tech Stack:** React 19、TypeScript、React Router 8、Vite 8、Tailwind CSS 4、Cloudflare Vite Plugin、Workers、D1、Hono 4、Zod 4、Vitest 4、Cloudflare Vitest Pool、Testing Library、Playwright。

## Global Constraints

- 所有新增文件必须位于 `学生成长档案系统/` 内。
- 固定课程科目仅为：语文、数学、英语、物理、化学、自然拼读、剑桥。
- 匿名用户既不能读取学生数据，也不能调用任何变更接口。
- 密码不得明文保存；会话 Cookie 必须为 HttpOnly、SameSite=Lax，生产环境 Secure。
- PC 优先，同时保证 390px 手机视口基本可用。
- 打印采用浏览器原生 `window.print()`；不引入服务端 PDF。
- 不实现任务书列出的 V1 排除项。

---

## File Structure

- `package.json`：脚本和固定依赖。
- `wrangler.jsonc`、`vite.config.ts`、`tsconfig*.json`、`eslint.config.js`：Cloudflare/Vite/TypeScript/质量配置。
- `migrations/0001_initial.sql`：管理员、会话和全部档案表、外键及索引。
- `shared/constants.ts`、`shared/contracts.ts`、`shared/validation.ts`：前后端共享科目、DTO 和 Zod 规则。
- `worker/index.ts`：Hono 应用装配与安全响应头。
- `worker/lib/auth.ts`、`worker/lib/http.ts`、`worker/lib/repository.ts`：认证原语、错误响应、D1 查询帮助器。
- `worker/routes/*.ts`：认证、学生、标签、成绩、晚辅、课程、完整档案接口。
- `scripts/create-admin.ts`：本地/远程管理员初始化入口，不保存密码。
- `src/api/client.ts`：同源 fetch、错误和 401 处理。
- `src/auth/*`：登录页、会话上下文和保护路由。
- `src/layout/*`：学生目录、响应式壳层和档案页头。
- `src/features/students/*`、`tags/*`、`scores/*`、`study/*`、`courses/*`、`print/*`：独立功能 UI。
- `src/styles.css`：Tailwind 入口、纸张视觉、响应式与打印样式。
- `worker/test/*`、`src/**/*.test.tsx`、`e2e/archive.spec.ts`：Worker、组件和浏览器验收。

---

### Task 1: 项目骨架、D1 Schema 与测试运行时

**Files:**
- Create: `package.json`, `vite.config.ts`, `wrangler.jsonc`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.worker.json`, `eslint.config.js`, `index.html`
- Create: `migrations/0001_initial.sql`, `shared/constants.ts`, `shared/contracts.ts`, `shared/validation.ts`
- Create: `vitest.worker.config.ts`, `vitest.ui.config.ts`, `worker/test/env.d.ts`, `worker/test/schema.test.ts`

**Interfaces:**
- Produces: `SUBJECTS` readonly tuple；D1 表及外键；共享 Student/Score/Record DTO；所有后续测试可用的本地 D1。

- [ ] **Step 1: 写 Schema 失败测试**

```ts
it('creates all archive tables and cascades student records', async () => {
  const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  expect(tables.results.map((row) => row.name)).toEqual(expect.arrayContaining([
    'admins', 'sessions', 'students', 'tags', 'student_tags', 'scores', 'study_records', 'course_records',
  ]));
});
```

- [ ] **Step 2: 运行 `npm run test:worker -- schema.test.ts`，确认因迁移/配置缺失而失败。**
- [ ] **Step 3: 建立最小项目配置、迁移和共享类型；外键启用 `ON DELETE CASCADE`，标签名和学生标签关系唯一。**
- [ ] **Step 4: 重跑 Schema 测试并执行 `npm run typecheck`，确认通过。**
- [ ] **Step 5: 提交 `chore: scaffold Cloudflare archive and D1 schema`。**

### Task 2: 安全登录、会话与管理员初始化

**Files:**
- Create: `worker/lib/auth.ts`, `worker/lib/http.ts`, `worker/routes/auth.ts`, `worker/index.ts`
- Create: `scripts/create-admin.ts`, `.dev.vars.example`
- Test: `worker/test/auth.test.ts`, `worker/test/helpers.ts`

**Interfaces:**
- Produces: `hashPassword(password, salt?)`、`verifyPassword`、`requireSession(c)`；`POST /api/auth/login|logout`、`GET /api/auth/me`；`POST /api/setup/admin` 仅在无管理员且 setup secret 匹配时工作。

- [ ] **Step 1: 写失败测试，覆盖 PBKDF2 摘要不含明文、错误密码、成功 Cookie、过期/注销会话、匿名业务请求 401、跨源变更 403。**

```ts
expect(admin.password_hash).not.toContain('Secret123!');
expect(login.headers.get('set-cookie')).toMatch(/HttpOnly.*SameSite=Lax/i);
expect((await SELF.fetch('https://app.test/api/students')).status).toBe(401);
```

- [ ] **Step 2: 运行 `npm run test:worker -- auth.test.ts`，确认路由缺失导致预期失败。**
- [ ] **Step 3: 用 Web Crypto 实现随机盐 PBKDF2-SHA-256、令牌摘要、固定时长比较和 7 天会话；所有 `/api` 档案路由统一挂载 `requireSession`。**
- [ ] **Step 4: 实现一次性初始化入口和 CLI；setup secret 只从 Worker secret/进程环境读取。**
- [ ] **Step 5: 运行认证测试、类型检查和 Lint。**
- [ ] **Step 6: 提交 `feat: add secure administrator sessions`。**

### Task 3: 学生与标签 API

**Files:**
- Create: `worker/lib/repository.ts`, `worker/routes/students.ts`, `worker/routes/tags.ts`
- Modify: `worker/index.ts`, `shared/contracts.ts`, `shared/validation.ts`
- Test: `worker/test/students.test.ts`, `worker/test/tags.test.ts`

**Interfaces:**
- Produces: `/api/students` CRUD/姓名搜索；`/api/tags` CRUD；`PUT /api/students/:id/tags` 原子替换标签；学生响应始终包含 `tags: Tag[]`。

- [ ] **Step 1: 写失败测试：创建后按年级返回、中文包含搜索、编辑、删除级联、标签新增/重名/改名/删除、学生多标签替换。**

```ts
const result = await authedJson('/api/students?search=张');
expect(result.students.map((student) => student.name)).toEqual(['张三']);
```

- [ ] **Step 2: 运行两个测试文件，确认 404/未实现失败。**
- [ ] **Step 3: 实现 Zod 校验、参数绑定 SQL、稳定排序和事务式标签替换；标签删除返回受影响学生数。**
- [ ] **Step 4: 重跑测试及全量 Worker 回归。**
- [ ] **Step 5: 提交 `feat: manage students and tags`。**

### Task 4: 成绩 API

**Files:**
- Create: `worker/routes/scores.ts`
- Modify: `worker/index.ts`, `shared/contracts.ts`, `shared/validation.ts`
- Test: `worker/test/scores.test.ts`

**Interfaces:**
- Produces: `/api/students/:studentId/scores` GET/POST；`/api/scores/:id` PUT/DELETE；输出按 `exam_date, created_at, id` 升序。

- [ ] **Step 1: 写失败测试，覆盖三次考试排序、空科目、0 分、编辑、删除、无效日期/范围、记录不可跨学生读取。**
- [ ] **Step 2: 运行成绩测试确认失败。**
- [ ] **Step 3: 实现最小路由，所有科目使用 `number | null`，更新时保留原创建时间。**
- [ ] **Step 4: 运行成绩测试与全量 Worker 测试。**
- [ ] **Step 5: 提交 `feat: add chronological score records`。**

### Task 5: 晚辅与课程 API

**Files:**
- Create: `worker/routes/study-records.ts`, `worker/routes/course-records.ts`
- Modify: `worker/index.ts`, `shared/contracts.ts`, `shared/validation.ts`
- Test: `worker/test/study-records.test.ts`, `worker/test/course-records.test.ts`

**Interfaces:**
- Produces: 晚辅和课程 CRUD；课程 GET 需要 `subject` 查询参数；响应含稳定的 `pageNumber` 与 `total`。

- [ ] **Step 1: 写失败测试：10 条晚辅旧到新、修改日期重排、删除、时间戳分离；数学 5/英语 3/物理 2 严格隔离；非法科目 422。**

```ts
expect((await authedJson('/api/students/1/courses?subject=数学')).records).toHaveLength(5);
expect((await authedJson('/api/students/1/courses?subject=英语')).records).toHaveLength(3);
```

- [ ] **Step 2: 运行两个测试文件确认失败。**
- [ ] **Step 3: 实现路由与资源归属检查，记录日期和系统时间分别保存。**
- [ ] **Step 4: 重跑模块与全量 Worker 测试。**
- [ ] **Step 5: 提交 `feat: add study and course notebooks`。**

### Task 6: 完整档案 API

**Files:**
- Create: `worker/routes/archive.ts`
- Modify: `worker/index.ts`, `shared/contracts.ts`
- Test: `worker/test/archive.test.ts`

**Interfaces:**
- Produces: `GET /api/students/:id/archive` 一次返回学生、标签、成绩、晚辅和仅有记录的 `courseSections`。

- [ ] **Step 1: 写失败测试，断言空科目章节被省略、每章内部排序稳定、匿名请求 401。**
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 用 D1 batch 查询实现聚合，不做 N+1 请求。**
- [ ] **Step 4: 重跑全量 Worker 测试、类型检查与 Lint。**
- [ ] **Step 5: 提交 `feat: provide printable archive data`。**

### Task 7: 登录 UI、API 客户端与响应式档案壳层

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/api/client.ts`
- Create: `src/auth/AuthProvider.tsx`, `src/auth/LoginPage.tsx`, `src/auth/ProtectedRoute.tsx`
- Create: `src/layout/ArchiveLayout.tsx`, `src/layout/StudentDirectory.tsx`, `src/layout/StudentHeader.tsx`
- Test: `src/auth/LoginPage.test.tsx`, `src/layout/StudentDirectory.test.tsx`, `src/test/setup.ts`

**Interfaces:**
- Produces: `api<T>()`；全局管理员会话；`/login` 和受保护 `/students/:id/*`；按年级折叠、中文搜索和移动抽屉。

- [ ] **Step 1: 写失败组件测试：登录错误保留用户名、401 回登录、学生按年级分组、输入“张”只显示匹配学生。**
- [ ] **Step 2: 运行 `npm run test:ui -- LoginPage StudentDirectory` 确认失败。**
- [ ] **Step 3: 实现 API 客户端、会话 Provider、路由和纸张式响应布局。**
- [ ] **Step 4: 重跑 UI 测试、类型检查和 Lint。**
- [ ] **Step 5: 提交 `feat: add authenticated archive workspace`。**

### Task 8: 学生与标签 UI

**Files:**
- Create: `src/features/students/StudentForm.tsx`, `src/features/students/StudentPage.tsx`
- Create: `src/features/tags/TagManager.tsx`, `src/features/tags/StudentTagsEditor.tsx`
- Modify: `src/layout/ArchiveLayout.tsx`, `src/layout/StudentHeader.tsx`
- Test: `src/features/students/StudentForm.test.tsx`, `src/features/tags/TagManager.test.tsx`

**Interfaces:**
- Produces: 新增/编辑/删除学生，标签 CRUD 与多选绑定；成功后目录和页头立即刷新。

- [ ] **Step 1: 写失败测试：必填姓名/年级、创建学生进入正确年级、编辑信息、删除确认、标签重名提示与绑定更新。**
- [ ] **Step 2: 运行相关 UI 测试确认失败。**
- [ ] **Step 3: 实现表单和对话框，网络失败时保留输入，成功时刷新查询状态。**
- [ ] **Step 4: 重跑 UI 与 Worker 回归测试。**
- [ ] **Step 5: 提交 `feat: add student and tag workflows`。**

### Task 9: 成绩时间轴 UI

**Files:**
- Create: `src/features/scores/ScoreTimeline.tsx`, `src/features/scores/ScoreForm.tsx`, `src/features/scores/ScorePage.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/scores/ScorePage.test.tsx`

**Interfaces:**
- Produces: 学生默认成绩页；新增/编辑/删除；只显示非空科目；按考试日期旧到新。

- [ ] **Step 1: 写失败测试：三次考试顺序、空物理不渲染、0 分渲染、编辑和删除调用正确接口。**
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 实现时间轴与共用表单；数值输入空字符串映射为 `null`。**
- [ ] **Step 4: 重跑模块和全量 UI 测试。**
- [ ] **Step 5: 提交 `feat: show score growth timeline`。**

### Task 10: 晚辅与课程电子笔记 UI

**Files:**
- Create: `src/components/NotebookPager.tsx`, `src/components/ConfirmDialog.tsx`
- Create: `src/features/study/StudyNotebook.tsx`, `src/features/study/StudyForm.tsx`
- Create: `src/features/courses/CourseSubjects.tsx`, `src/features/courses/CourseNotebook.tsx`, `src/features/courses/CourseForm.tsx`
- Modify: `src/App.tsx`, `src/styles.css`
- Test: `src/features/study/StudyNotebook.test.tsx`, `src/features/courses/CourseNotebook.test.tsx`

**Interfaces:**
- Produces: 旧到新单页浏览、页码、上一页/下一页；晚辅和课程 CRUD；固定七科切换。

- [ ] **Step 1: 写失败测试：10 页边界、按钮禁用、编辑日期后重排；科目切换重新请求且不混用记录；新建日期默认本地今天。**
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 实现通用分页器和两个笔记模块，保留轻量纸张/书页视觉而不添加动画依赖。**
- [ ] **Step 4: 重跑 UI 测试、类型检查和 Lint。**
- [ ] **Step 5: 提交 `feat: add archive notebook experience`。**

### Task 11: 打印档案页面

**Files:**
- Create: `src/features/print/PrintArchivePage.tsx`, `src/features/print/PrintArchivePage.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `/students/:id/print` 完整档案；屏幕打印按钮调用 `window.print()`；打印媒体仅保留档案正文。

- [ ] **Step 1: 写失败测试：封面/成绩/晚辅/有数据科目存在，空剑桥章不存在，打印按钮调用原生 API。**
- [ ] **Step 2: 运行测试确认失败。**
- [ ] **Step 3: 实现打印组件和 `@page size: A4`、页边距、章节分页、`break-inside: avoid`、计数器页码及 `.no-print` 隐藏。**
- [ ] **Step 4: 重跑 UI 全量测试并生产构建。**
- [ ] **Step 5: 提交 `feat: add A4 student archive printing`。**

### Task 12: Playwright 全流程验收、文档与部署检查

**Files:**
- Create: `playwright.config.ts`, `e2e/archive.spec.ts`, `e2e/fixtures.ts`
- Create: `README.md`, `docs/deployment.md`, `.gitignore`, `.env.example`
- Modify: `package.json`, `wrangler.jsonc`

**Interfaces:**
- Produces: 可重复的本地初始化、完整浏览器验收、Cloudflare D1/secret/deploy 操作说明。

- [ ] **Step 1: 写 E2E 失败测试，逐条编码任务书验收：学生/标签；三次成绩；十条晚辅；数学 5、英语 3、物理 2；刷新持久化；日期重排；打印章节；退出后页面和 API 401。**
- [ ] **Step 2: 首次运行 `npm run test:e2e`，确认在缺少最终启动/种子脚本时失败。**
- [ ] **Step 3: 补齐本地 D1 reset/migrate/seed、Playwright webServer 和可访问性标签；不弱化断言。**
- [ ] **Step 4: 在 1440×900、768×1024、390×844 三种视口运行主流程；对桌面、移动和 print media 截图做视觉检查。**
- [ ] **Step 5: 运行最终门禁：`npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build`。**
- [ ] **Step 6: 检查 `npx wrangler whoami`；若已授权，创建远程 D1、应用迁移、设置秘密并 `npm run deploy`；未授权则记录该外部前置条件，不伪造部署结果。**
- [ ] **Step 7: 对照原任务书逐条完成验收矩阵并提交 `test: verify complete V1 archive workflows`。**
