# V1 验收矩阵

| 范围 | 自动验收证据 | 结果 |
| --- | --- | --- |
| 管理员初始化、登录、退出、会话哈希、同源校验 | Worker 集成测试 + Playwright 真实 Cookie 流程 | 通过 |
| 未登录页面保护、GET/POST API 401 | Worker 集成测试 + Playwright 退出后请求 | 通过 |
| 学生增删改、年级目录、中文搜索 | UI 测试 + Playwright 创建/编辑/搜索 | 通过 |
| 标签增删改、重名、绑定和解除 | Worker/UI 测试 + Playwright 绑定 | 通过 |
| 成绩增删改、空科目、0 分、日期排序、刷新持久化 | Worker/UI 测试 + Playwright 三次成绩流程 | 通过 |
| 晚辅增删改、10 页边界、翻页、改日期重排、刷新持久化 | Worker/UI 测试 + Playwright 十条记录 | 通过 |
| 七科固定、数学/英语/物理隔离、翻页和 CRUD | Worker/UI 测试 + Playwright 5/3/2 条课程记录 | 通过 |
| 完整档案聚合、空课程章节不输出 | Worker/UI 测试 + Playwright 打印页断言 | 通过 |
| A4 打印媒体、按钮隐藏、记录不跨页 | Playwright 生成 PDF + Poppler 逐页渲染检查 | 通过 |
| 桌面 1440×900、平板 768×1024、手机 390×844 | Playwright 截图 + 人工视觉检查 | 通过 |
| 类型、Lint、生产构建 | `npm run typecheck`、`npm run lint`、`npm run build` | 通过 |
| 生产 Cloudflare 部署 | `npx wrangler whoami` | 未执行：本机未登录，需外部授权 |

浏览器全流程每次执行前都会迁移并清空本地测试 D1，确保结果可重复且不依赖历史数据。
