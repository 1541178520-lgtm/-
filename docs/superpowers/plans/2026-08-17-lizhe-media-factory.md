# 创新学苑李哲新媒体工厂 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立与皓月体育完全隔离的李哲内容生产与发布项目：每周二、周四读取上周五 20:00 生成的李哲脚本，制作抖音视频与小红书人工发布包，抖音在全部门禁通过后立即发布，小红书只提醒人工发布。

**Architecture:** 新建独立 Git 项目 `C:\Users\Acer\Desktop\projects\创新学苑新媒体`，采用 Node.js ESM 编排、Remotion 渲染视频、Sharp 生成小红书图片、Python 调用豆包/Edge TTS、ComfyUI 提供可选本地生图。生产包经内容门禁、资产白名单、SHA-256 定稿、只读快照后，才可交给 D 盘独立的 `lizhe` 抖音发布运行时。状态账本和发布回执共同保证重试不重复制作、不重复发布。

**Tech Stack:** Node.js 24、pnpm、JavaScript ESM、TypeScript/React、Remotion、Sharp、Mammoth、Cheerio、Python 3.11、edge-tts、ComfyUI、SDXL Base 1.0、Stable Diffusion 1.5、FFmpeg、Node `node:test`。

## Global Constraints

- 批量/大体积模型、缓存、浏览器状态和发布回执放在 `D:\CodexProjects`；C 盘只放源码和最终业务产出。
- 只从 `C:\Users\Acer\Documents\微信教培小程序\docs\新媒体周脚本` 读取最近一个周五的标准 DOCX；不以旧周文件或皓月体育内容补位。
- 只允许通过清单导入旧教育资产；任何皓月体育路径、账号、品牌词、颜色组合、发布回执或运行时依赖都必须拒绝。
- 李哲不出镜，不生成仿冒李哲真人的虚拟人物；正式文字、日期、政策名称和公式由代码渲染。
- 豆包 TTS 失败时只生成 Edge 试听，不自动把不同音色的试听件发布。
- 小红书没有自动上传路径。任何 `platform=xiaohongshu` 发布请求都必须返回 `manual_app_publish_required`，且不得启动子进程。
- 抖音命令必须使用 `--account lizhe --headed`，不得含 `--schedule`；只有页面成功证据确认后才能写 `published`。
- 首次上线先做不发布的完整干跑；用户人工检查后，再明确批准一条低风险内容进行首次即时发布；成功后才能启用周期自动任务。
- 每个任务遵循红—绿—重构：先写失败测试，运行并确认目标失败，再写最小实现，运行目标测试和全量测试，最后提交。

---

## Task 1: 建立独立项目骨架和固定配置

**Files:**

- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\package.json`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\.gitignore`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\README.md`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\config\persona.json`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\config\paths.json`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\config\publisher.json`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\config\content-policy.json`
- Create: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\src\config.mjs`
- Test: `C:\Users\Acer\Desktop\projects\创新学苑新媒体\tests\config.test.mjs`

- [ ] **Step 1: 创建目录和独立 Git 仓库**

Run:

```powershell
New-Item -ItemType Directory -Force 'C:\Users\Acer\Desktop\projects\创新学苑新媒体' | Out-Null
git init 'C:\Users\Acer\Desktop\projects\创新学苑新媒体'
```

Expected: 新目录中存在独立 `.git`，皓月体育仓库无改动。

- [ ] **Step 2: 写配置失败测试**

`tests/config.test.mjs` 至少断言：

```js
assert.equal(config.persona.name, '创新学苑·李哲');
assert.equal(config.persona.volcVoice, 'zh_male_yangguangqingnian_moon_bigtts');
assert.equal(config.persona.edgeVoice, 'zh-CN-YunxiNeural');
assert.equal(config.paths.publisherRoot, 'D:\\CodexProjects\\lizhe-publisher');
assert.equal(config.publisher.account, 'lizhe');
assert.equal(config.publisher.xiaohongshuMode, 'manual_app_publish_required');
assert.ok(config.denied.some((item) => item.includes('皓月体育')));
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `pnpm test -- tests/config.test.mjs`

Expected: FAIL，`src/config.mjs` 或配置文件不存在。

- [ ] **Step 4: 写最小配置与加载器**

固定 `paths.json`：

```json
{
  "upstreamDir": "C:\\Users\\Acer\\Documents\\微信教培小程序\\docs\\新媒体周脚本",
  "outputRoot": "C:\\Users\\Acer\\Desktop\\projects\\创新学苑新媒体\\产出",
  "workRoot": "C:\\Users\\Acer\\Desktop\\projects\\创新学苑新媒体\\工作区",
  "imageRuntimeRoot": "D:\\CodexProjects\\innovation-image-generation",
  "publisherRoot": "D:\\CodexProjects\\lizhe-publisher",
  "ledgerPath": "C:\\Users\\Acer\\Desktop\\projects\\创新学苑新媒体\\state\\ledger.json"
}
```

固定 `persona.json`：

```json
{
  "name": "创新学苑·李哲",
  "volcVoice": "zh_male_yangguangqingnian_moon_bigtts",
  "edgeVoice": "zh-CN-YunxiNeural",
  "primaryColor": "#3b82f6",
  "accentColor": "#f59e0b",
  "onCamera": false
}
```

固定 `publisher.json`：

```json
{
  "account": "lizhe",
  "douyinMode": "immediate",
  "headed": true,
  "xiaohongshuMode": "manual_app_publish_required"
}
```

`package.json` 使用 ESM，脚本至少包括：

```json
{
  "scripts": {
    "test": "node --test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "produce": "node scripts/run-production.mjs",
    "finalize": "node scripts/finalize-package.mjs",
    "publish:now": "node scripts/publish-now.mjs",
    "verify": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

安装固定职责依赖：`mammoth`、`cheerio`、`sharp`、`zod`、`@remotion/cli`、`@remotion/bundler`、`remotion`、`react`、`react-dom`；开发依赖使用 `typescript`、`eslint`、`@eslint/js`、`docx`。`docx` 只用于在测试中生成结构化 DOCX 夹具，不进入生产解析路径。

- [ ] **Step 5: 运行测试和配置审计**

Run:

```powershell
pnpm install
pnpm test -- tests/config.test.mjs
rg -n "haoyue|皓月体育|haoyue-publisher" . -g '!docs/**' -g '!tests/**'
```

Expected: 测试 PASS；搜索只允许在显式拒绝列表中出现隔离关键词。

- [ ] **Step 6: 提交骨架**

```powershell
git add package.json pnpm-lock.yaml .gitignore README.md config src/config.mjs tests/config.test.mjs
git commit -m "chore: scaffold isolated lizhe media factory"
```

---

## Task 2: 解析周脚本、选择周二/周四内容并建立幂等账本

**Files:**

- Create: `src/week-source.mjs`
- Create: `src/lizhe-parser.mjs`
- Create: `src/script-selector.mjs`
- Create: `src/ledger.mjs`
- Create: `tests/helpers/docx-fixture.mjs`
- Test: `tests/week-source.test.mjs`
- Test: `tests/lizhe-parser.test.mjs`
- Test: `tests/script-selector.test.mjs`
- Test: `tests/ledger.test.mjs`

- [ ] **Step 1: 写最近周五与文件名门禁测试**

测试固定时区 `Asia/Shanghai`，覆盖：周二/周四都只接受上一个最近周五；日期前缀不符、DOCX 损坏、文件不存在、旧一周文件都拒绝。核心接口：

```js
findExpectedWeeklyDocx({ now, upstreamDir })
// => { weekFriday: '2026-08-14', path, sha256 }
```

- [ ] **Step 2: 确认失败并实现周文件发现**

Run: `pnpm test -- tests/week-source.test.mjs`

Expected before implementation: FAIL；实现后 PASS。实现必须读取文件头确认 ZIP/DOCX 可打开，再计算 SHA-256，不允许只看扩展名。

- [ ] **Step 3: 写 DOCX 解析失败测试**

测试助手生成包含四人人物段落和表格的临时 DOCX；李哲段落必须能提取为恰好两条：

```js
{
  id: '2026-08-14-lizhe-01',
  order: 1,
  owner: '李哲',
  category: 'policy',
  topic: '主题',
  source: { title: '深圳市教育局通知', url: 'https://www.sz.gov.cn/', publishedAt: '2026-08-13' },
  parentNeed: '家长需求',
  shots: [{ index: 1, visual: '画面', voiceover: '口播', subtitle: '字幕', assets: [] }],
  compliance: ['已核来源']
}
```

失败用例：李哲 0/1/3 条、缺主题、缺口播、缺字幕、缺素材清单、政策缺来源或日期。

- [ ] **Step 4: 用 Mammoth HTML + Cheerio 实现稳健解析**

`extractLizheScripts(docxPath)` 先 `mammoth.convertToHtml({path})`，再按“人物标题 → 内容卡/表格”解析；不得从全文模糊搜索后猜归属。无法形成明确结构时抛出带字段路径的错误，例如 `lizhe[1].source.publishedAt missing`。

Run: `pnpm test -- tests/lizhe-parser.test.mjs`

Expected: PASS，且测试输出恰好 2 条稳定 ID。

- [ ] **Step 5: 写日期选择和去重失败测试**

接口：

```js
selectForRun({ now, scripts, ledger })
// Tuesday => order 1; Thursday => order 2; other day => unsupported_run_day
```

断言同一 `weekFriday + sourceSha256 + scriptId` 已到 `published` 或 `ready_to_publish` 时禁止再次发布；同一周二/周四不能选择同一脚本。

- [ ] **Step 6: 实现原子账本**

账本 schema：

```json
{
  "version": 1,
  "entries": [{
    "weekFriday": "2026-08-14",
    "sourcePath": "C:\\Users\\Acer\\Documents\\微信教培小程序\\docs\\新媒体周脚本\\2026-08-14_创新学苑_深圳教育圈_四人新媒体周脚本.docx",
    "sourceSha256": "64-char-hex",
    "scriptId": "2026-08-14-lizhe-01",
    "slot": "tuesday",
    "productionStatus": "not_started",
    "finalizedSha256": null,
    "douyinStatus": "not_attempted",
    "xiaohongshuStatus": "not_reminded",
    "timestamps": {},
    "error": null
  }]
}
```

写入采用同目录临时文件、`fsync`、原子重命名；加锁文件使用独占创建，进程退出时清理，超时锁必须人工确认后才能清除。

Run: `pnpm test -- tests/script-selector.test.mjs tests/ledger.test.mjs`

Expected: PASS，包括并发第二进程拿不到锁、异常写入不损坏旧账本。

- [ ] **Step 7: 提交输入契约**

```powershell
git add src tests
git commit -m "feat: ingest weekly scripts with idempotent selection"
```

---

## Task 3: 建立合规门禁和旧教育资产白名单

**Files:**

- Create: `src/compliance.mjs`
- Create: `src/source-verifier.mjs`
- Create: `src/path-guard.mjs`
- Create: `src/legacy-assets.mjs`
- Create: `scripts/import-legacy-asset.mjs`
- Create: `assets/legacy-approved/manifest.json`
- Test: `tests/compliance.test.mjs`
- Test: `tests/source-verifier.test.mjs`
- Test: `tests/path-guard.test.mjs`
- Test: `tests/legacy-assets.test.mjs`

- [ ] **Step 1: 写内容风险失败测试**

至少拒绝：`保提分`、`百分百录取`、`稳上名校`、`排名保证`、`不过退费`、制造焦虑、未脱敏姓名/手机号/准考证号；政策类缺官方来源、发布日期、深圳/坪山相关性、行动建议时拒绝。

同时实现“替代词不是规避审核工具”的规则：可以自然使用“数理思维”“小家人”，但不得为了规避平台检测而故意错写事实、拆字、谐音或隐藏教培属性。

- [ ] **Step 2: 实现结构化合规报告**

```js
validateContent(script)
// => { ok, errors: [{code, field, message}], warnings: [{code, field, message}] }
```

政策必须保留官方名称，不能把政策原文中的“数学”“学生”改成含义不准确的替代词。平台文案可在不损失准确性的句子中使用更温和表达。

Run: `pnpm test -- tests/compliance.test.mjs`

Expected: PASS。

- [ ] **Step 3: 写并实现政策来源复核测试**

接口：

```js
verifyPolicySource({ source, now, fetchImpl })
// => { ok, canonicalUrl, publisher, publishedAt, checkedAt, contentSha256, evidence }
```

只允许 HTTPS；官方来源优先接受 `gov.cn`、`sz.gov.cn` 及配置中明确登记的深圳教育主管部门/学校官网域名。测试覆盖：页面标题和发布日期吻合、重定向后仍为允许域名、发布日期缺失、链接失效、正文与脚本关键事实不符、非官方自媒体冒充通知。无法在线复核时返回 `source_verification_required` 并停止政策内容生产，不以搜索摘要替代原文证据。

Run: `pnpm test -- tests/source-verifier.test.mjs`

Expected: PASS。

- [ ] **Step 4: 写路径和品牌隔离失败测试**

所有输入路径先 `realpath`，再拒绝：任何包含 `皓月体育`、`皓月田径`、`haoyue-publisher` 的路径，任何最终路径逃出配置根目录的软链接/联接点，账号不等于 `lizhe`，以及体育品牌词/水印/固定色板组合。

- [ ] **Step 5: 实现资产清单校验和导入 CLI**

`manifest.json` 初始内容：

```json
{ "version": 1, "assets": [] }
```

每条资产：

```json
{
  "path": "images/classroom-desk-01.png",
  "originalPath": "C:\\Users\\Acer\\Desktop\\projects\\视频剪辑\\video-factory\\assets\\a136131.jpeg",
  "sha256": "64-char-hex",
  "type": "image",
  "allowedUses": ["policy-background", "stem-broll"],
  "license": "self-created",
  "authorization": "no-identifiable-person",
  "reviewedAt": "2026-08-17T00:00:00+08:00"
}
```

导入命令先做只读审计，只有显式 `--apply` 才复制；复制后复算哈希。无授权人物、旧违规文案、体育来源路径直接拒绝。

Run:

```powershell
pnpm test -- tests/source-verifier.test.mjs tests/path-guard.test.mjs tests/legacy-assets.test.mjs
node scripts/import-legacy-asset.mjs --source 'C:\Users\Acer\Desktop\projects\视频剪辑\video-factory\assets\a136131.jpeg' --type image --use stem-broll --license self-created --authorization no-identifiable-person
```

Expected: 测试 PASS；未传 `--apply` 只输出审计结果，不产生文件。

- [ ] **Step 6: 提交门禁**

```powershell
git add src scripts assets tests
git commit -m "feat: enforce content and asset isolation gates"
```

---

## Task 4: 构建正式包、定稿哈希和只读发布快照

**Files:**

- Create: `src/package-builder.mjs`
- Create: `src/finalization.mjs`
- Create: `src/publish-snapshot.mjs`
- Create: `scripts/finalize-package.mjs`
- Test: `tests/package-builder.test.mjs`
- Test: `tests/finalization.test.mjs`
- Test: `tests/publish-snapshot.test.mjs`

- [ ] **Step 1: 写包结构和不可覆盖测试**

`buildPackage()` 必须创建：

```text
产出\YYYY-MM-DD_主题短名\
├─ 发布说明.txt
├─ source.json
├─ 小红书\小红书发布文案.txt
├─ 小红书\图片\
└─ 抖音\抖音发布文案.txt
  └─ 视频\成片.mp4 / 字幕.srt / 视频字幕.txt
```

目录已存在时拒绝覆盖；输出根目录外、符号链接、联接点一律拒绝。

- [ ] **Step 2: 实现包构建并通过测试**

Run: `pnpm test -- tests/package-builder.test.mjs`

Expected: PASS。

- [ ] **Step 3: 写定稿清单和篡改检测测试**

定稿文件 `.lizhe-finalized.json` 包含版本、包相对路径、源哈希、脚本 ID、所有文件相对路径/大小/SHA-256、定稿时间和总包哈希。定稿后修改任意字节、增加或删除任意文件，`verifyFinalizedPackage` 都必须失败。

- [ ] **Step 4: 实现定稿与快照**

只把 `抖音` 子目录和必要元数据复制到：

`D:\CodexProjects\lizhe-publisher\snapshots\550e8400-e29b-41d4-a716-446655440000`（运行时将示例 UUID 替换为 `crypto.randomUUID()` 的返回值）

复制前后校验哈希；用 Windows ACL 去除普通写权限。小红书目录绝不进入发布快照。

Run: `pnpm test -- tests/finalization.test.mjs tests/publish-snapshot.test.mjs`

Expected: PASS，包括“快照中不存在小红书文件”“发布后源包未变化”。

- [ ] **Step 5: 提交包完整性模块**

```powershell
git add src scripts tests
git commit -m "feat: finalize immutable publication packages"
```

---

## Task 5: 生成小红书 6–9 图人工发布包

**Files:**

- Create: `src/copy-writer.mjs`
- Create: `src/xhs-card-plan.mjs`
- Create: `src/xhs-card-renderer.mjs`
- Create: `assets/fonts/README.md`
- Test: `tests/copy-writer.test.mjs`
- Test: `tests/xhs-card-plan.test.mjs`
- Test: `tests/xhs-card-renderer.test.mjs`

- [ ] **Step 1: 写平台文案结构测试**

接口输出：

```js
{
  douyin: { title, description, tags, aiDisclosure, sourceLine },
  xiaohongshu: { title, body, coverText, keywords, sourceLine, manualOnly: true }
}
```

测试标题长度、首行信息密度、来源日期、无结果承诺、无诱导互动、标签数量上限和政策名准确性。小红书必须带 `manualOnly: true`。

- [ ] **Step 2: 实现内容卡片计划**

政策类固定 7 张：封面、发生了什么、适用人群、关键日期、家长行动清单、官方来源截图/摘录、边界与提醒。数理化类固定 7 张：封面、问题、常见误区、核心思路、分步示例、迁移练习、总结。

允许根据内容压缩为 6 张或扩展到 9 张，但测试拒绝范围外数量。

- [ ] **Step 3: 用 Sharp 实现 1080×1440 卡片渲染**

卡片文字通过 SVG 叠加；使用系统可商用中文字体或项目明确记录的字体，不把中文交给生图模型。输出 `01_封面.png` 到 `0N_*.png`。

Run:

```powershell
pnpm test -- tests/copy-writer.test.mjs tests/xhs-card-plan.test.mjs tests/xhs-card-renderer.test.mjs
```

Expected: PASS；使用 Sharp 元数据断言每张图恰好 1080×1440，数量 6–9。

- [ ] **Step 4: 提交图文生产模块**

```powershell
git add src assets tests
git commit -m "feat: generate manual xiaohongshu card packages"
```

---

## Task 6: 建立李哲配音、统一时间轴和 Remotion 视频模板

**Files:**

- Create: `scripts/generate-voice.py`
- Create: `src/tts-runner.mjs`
- Create: `src/timeline.mjs`
- Create: `render/index.tsx`
- Create: `render/Root.tsx`
- Create: `render/types.ts`
- Create: `render/theme.ts`
- Create: `render/LizheVideo.tsx`
- Create: `render/scenes/HookScene.tsx`
- Create: `render/scenes/PolicySourceScene.tsx`
- Create: `render/scenes/TimelineScene.tsx`
- Create: `render/scenes/FormulaScene.tsx`
- Create: `render/scenes/ImageScene.tsx`
- Create: `render/scenes/CaptionOverlay.tsx`
- Create: `scripts/render-video.mjs`
- Test: `tests/tts-runner.test.mjs`
- Test: `tests/timeline.test.mjs`
- Test: `tests/render-contract.test.mjs`

- [ ] **Step 1: 写 TTS 命令和降级测试**

正式音频只能是豆包音色 `zh_male_yangguangqingnian_moon_bigtts`。测试注入假执行器，覆盖：豆包成功、缺 API 凭据、接口失败后生成 Edge 试听、Edge 试听件被标记 `preview_only` 且不能进入正式包。

```js
generateVoice({ text, outputDir, executor })
// => { status: 'formal'|'preview_only', provider, voice, audioPath, durationMs }
```

- [ ] **Step 2: 实现 Python 语音脚本和 Node 包装器**

Python 使用 3.11；豆包凭据只从环境变量读取，不写入配置或日志。Edge 试听使用 `edge-tts`，文件名明确加 `_试听_不可发布.mp3`。

Run: `pnpm test -- tests/tts-runner.test.mjs`

Expected: PASS。

- [ ] **Step 3: 写时间轴测试**

`buildTimeline({ shots, voiceDurationMs, fps: 30 })` 生成 6–12 个视觉段落、字幕 cue 和 SRT；第一个镜头 0–1 秒有动作，1–3 秒出现具体钩子；所有镜头总时长等于音频时长，字幕不越界。

- [ ] **Step 4: 实现李哲专属 Remotion 视觉系统**

固定 1080×1920、30fps，主色 `#3b82f6`、辅色 `#f59e0b`。所有场景必须接收结构化数据；禁止复制皓月体育片头、品牌色、Logo、账号水印或文案。政策场景显示来源、发布日期与真实截图；公式场景用 SVG/HTML 渲染公式与图形。

- [ ] **Step 5: 加入渲染前后参数校验**

渲染前拒绝小于 6 或大于 12 个视觉段落。渲染后用 `ffprobe` 断言：1080×1920、30fps、时长 30–60 秒、含音轨；字幕 SRT 和烧录文本均存在。

Run:

```powershell
pnpm test -- tests/timeline.test.mjs tests/render-contract.test.mjs
pnpm typecheck
```

Expected: PASS。

- [ ] **Step 6: 提交视频系统**

```powershell
git add scripts src render tests
git commit -m "feat: render lizhe videos with synchronized voice and captions"
```

---

## Task 7: 在 D 盘部署可选本地生图并实现无模型降级

**Files:**

- Create: `scripts/setup-comfyui.ps1`
- Create: `scripts/start-comfyui.ps1`
- Create: `scripts/comfyui-smoke-test.mjs`
- Create: `config/comfyui-sdxl-api.json`
- Create: `config/comfyui-sd15-api.json`
- Create: `src/comfyui-client.mjs`
- Create: `src/visual-asset-selector.mjs`
- Create: `state/model-licenses.json`
- Test: `tests/comfyui-client.test.mjs`
- Test: `tests/visual-asset-selector.test.mjs`

- [ ] **Step 1: 写生图 API 和降级测试**

测试不启动真实 ComfyUI，注入本地 HTTP 假服务，覆盖：SDXL 成功、显存不足改用 SD1.5、服务不可用改用真实截图/代码图形/白名单资产、两模型失败但生产仍可继续。禁止用 AI 图伪造政府通知、校区事件、成绩或人物见证。

- [ ] **Step 2: 实现 ComfyUI API 工作流**

SDXL API 图固定核心节点：

```json
{
  "4": {"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"sd_xl_base_1.0.safetensors"}},
  "6": {"class_type":"CLIPTextEncode","inputs":{"text":"{{prompt}}","clip":["4",1]}},
  "7": {"class_type":"CLIPTextEncode","inputs":{"text":"text, watermark, logo, document, score report, identifiable person","clip":["4",1]}},
  "5": {"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},
  "3": {"class_type":"KSampler","inputs":{"seed":1,"steps":28,"cfg":6.5,"sampler_name":"dpmpp_2m","scheduler":"karras","denoise":1,"model":["4",0],"positive":["6",0],"negative":["7",0],"latent_image":["5",0]}},
  "8": {"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},
  "9": {"class_type":"SaveImage","inputs":{"filename_prefix":"lizhe","images":["8",0]}}
}
```

客户端只访问 `127.0.0.1`，设置超时，输出图片必须复制进本次工作区并计算哈希。

- [ ] **Step 3: 编写 D 盘安装脚本**

安装根目录固定 `D:\CodexProjects\innovation-image-generation`，虚拟环境使用本机 Python 3.11：

```powershell
$pythonExe = 'C:\Users\Acer\AppData\Roaming\uv\python\cpython-3.11.15-windows-x86_64-none\python.exe'
& $pythonExe -m venv 'D:\CodexProjects\innovation-image-generation\.venv'
```

脚本安装 ComfyUI 和匹配 RTX 3060 的 CUDA PyTorch，模型分别放到 `ComfyUI\models\checkpoints`。模型下载后记录来源、版本、许可证、文件大小和 SHA-256 到 `state/model-licenses.json`；许可证未确认时不允许正式使用。

启动参数至少包含 `--listen 127.0.0.1 --lowvram`。SD1.5 工作流使用 512×768，再由 Sharp 做画布适配；不在本任务安装 MiniMax H3、FLUX 或本地视频模型。

- [ ] **Step 4: 跑单元测试和可选真实烟测**

Run:

```powershell
pnpm test -- tests/comfyui-client.test.mjs tests/visual-asset-selector.test.mjs
powershell -ExecutionPolicy Bypass -File scripts/setup-comfyui.ps1
powershell -ExecutionPolicy Bypass -File scripts/start-comfyui.ps1
node scripts/comfyui-smoke-test.mjs --model sd15 --prompt 'clean study desk, blue and amber light, no text, no people'
```

Expected: 单测 PASS；真实烟测生成一张非文字背景图。若安装或显存烟测失败，记录为 `local_image_optional_unavailable`，不阻塞后续真实素材/代码图形生产。

- [ ] **Step 5: 提交本地生图集成**

```powershell
git add scripts config src state tests
git commit -m "feat: add optional local image generation with safe fallback"
```

---

## Task 8: 完成周二/周四生产编排和可恢复状态机

**Files:**

- Create: `src/production-state.mjs`
- Create: `src/production-runner.mjs`
- Create: `scripts/run-production.mjs`
- Create: `tests/production-runner.test.mjs`
- Create: `tests/production-recovery.test.mjs`

- [ ] **Step 1: 写端到端假执行器失败测试**

按顺序断言：发现源文件 → 解析 2 条李哲脚本 → 选择当天脚本 → 合规 → 政策来源复核（非政策内容跳过）→ 素材计划 → 配音 → 时间轴 → 小红书图 → 视频 → 媒体参数校验 → 定稿。任何阶段失败都保留工作区并写错误状态，后续阶段不得执行。

- [ ] **Step 2: 定义明确状态机**

允许状态：

```text
not_started -> source_validated -> content_validated -> assets_ready
-> voice_ready -> rendered -> package_validated -> finalized -> ready_to_publish
-> publish_in_progress -> published | publish_failed | publish_unknown
```

`preview_only` 配音、篡改包或合规失败不能进入 `finalized`。重试从最后一个已校验状态继续；`published` 永远终止；`publish_unknown` 必须人工核对后处理。

- [ ] **Step 3: 实现 CLI 模式**

```powershell
pnpm produce -- --at '2026-08-18T09:00:00+08:00' --dry-run
pnpm produce -- --at '2026-08-20T09:00:00+08:00' --dry-run
```

`--dry-run` 可以制作并定稿，但绝不调用发布器。没有 `--at` 时使用当前北京时间；非周二/周四返回 `unsupported_run_day`。

- [ ] **Step 4: 运行生产与恢复测试**

Run:

```powershell
pnpm test -- tests/production-runner.test.mjs tests/production-recovery.test.mjs
pnpm test
```

Expected: PASS；测试证明同源哈希/脚本 ID 不重复制作，崩溃恢复不跳过门禁。

- [ ] **Step 5: 提交编排器**

```powershell
git add src scripts tests
git commit -m "feat: orchestrate recoverable twice-weekly production"
```

---

## Task 9: 建立独立抖音运行时和“立即发布但不误报”适配器

**Files:**

- Create: `scripts/setup-publisher-runtime.ps1`
- Create: `src/publisher-command.mjs`
- Create: `src/publish-result.mjs`
- Create: `src/publisher-runner.mjs`
- Create: `tests/publisher-command.test.mjs`
- Create: `tests/publish-result.test.mjs`
- Create: `tests/publisher-runner.test.mjs`
- External runtime: `D:\CodexProjects\lizhe-publisher\social-auto-upload`
- Modify in external runtime: `D:\CodexProjects\lizhe-publisher\social-auto-upload\sau_cli.py`
- Modify in external runtime: `D:\CodexProjects\lizhe-publisher\social-auto-upload\uploader\douyin_uploader\main.py`
- Test in external runtime: `D:\CodexProjects\lizhe-publisher\social-auto-upload\tests\test_douyin_publish_result.py`

- [ ] **Step 1: 写命令构造和小红书硬阻断测试**

```js
buildPublishRequest({
  platform: 'douyin',
  account: 'lizhe',
  file: 'D:\\CodexProjects\\lizhe-publisher\\snapshots\\550e8400-e29b-41d4-a716-446655440000\\抖音\\视频\\成片.mp4',
  title: '政策变化先看这三点',
  description: '来源：深圳市教育局，发布日期：2026-08-13',
  tags: ['深圳家长', '升学规划']
})
// args contains every supplied field plus: douyin upload-video --account lizhe --headed
// args does not contain: --schedule, xiaohongshu, haoyue

buildPublishRequest({ platform: 'xiaohongshu', account: 'lizhe' })
// => { status: 'manual_app_publish_required', spawn: false }
```

测试还要验证标题/正文/标签作为参数数组传递，不拼 shell 字符串，防止命令注入。

- [ ] **Step 2: 实现独立运行时安装**

安装脚本从上游 Git 地址创建干净副本到 `D:\CodexProjects\lizhe-publisher\social-auto-upload`，不得复制 `D:\CodexProjects\haoyue-publisher` 的 cookies、`.venv`、日志或缓存。因本机 Git 全局代理重写可能异常，克隆命令使用单次环境变量绕过：

```powershell
$env:GIT_CONFIG_GLOBAL = 'NUL'
git clone https://github.com/dreammis/social-auto-upload.git 'D:\CodexProjects\lizhe-publisher\social-auto-upload'
Remove-Item Env:GIT_CONFIG_GLOBAL
```

用 Python 3.11 和仓库内 `uv.lock` 创建 `D:\CodexProjects\lizhe-publisher\.venv`，安装锁定依赖和 Patchright Chromium：

```powershell
$env:UV_PROJECT_ENVIRONMENT = 'D:\CodexProjects\lizhe-publisher\.venv'
uv sync --locked --python 'C:\Users\Acer\AppData\Roaming\uv\python\cpython-3.11.15-windows-x86_64-none\python.exe' --directory 'D:\CodexProjects\lizhe-publisher\social-auto-upload'
& 'D:\CodexProjects\lizhe-publisher\.venv\Scripts\python.exe' -m patchright install chromium
Remove-Item Env:UV_PROJECT_ENVIRONMENT
```

运行时 cookies 只能出现 `douyin_lizhe.json`。

- [ ] **Step 3: 补强发布器成功证据**

当前上游 CLI 仅输出 `Douyin video upload submitted`，这不足以证明发布成功。只在李哲独立副本中补强：抖音 uploader 点击发布后等待成功 toast、成功页 URL 或内容管理页出现新稿件证据；返回结构化 JSON：

```json
{
  "status": "published",
  "account": "lizhe",
  "strategy": "immediate",
  "evidence": {"kind": "success_toast", "value": "视频发布成功"},
  "pageUrl": "https://creator.douyin.com/creator-micro/content/manage",
  "confirmedAt": "2026-08-18T09:10:00+08:00"
}
```

验证码返回 `captcha_required`；登录失效返回 `login_required`；选择器/页面变化返回 `page_changed`；命令退出但无成功证据返回 `publish_unknown`。这些状态都不得映射为 `published`。

先在李哲发布器仓库写 `tests/test_douyin_publish_result.py`，用 Patchright 页面替身分别模拟成功 toast、验证码、登录页、未知页面和超时；确认失败后，再让 `upload_video()` 返回结构化结果，并由 `sau_cli.py` 输出单行 JSON。禁止修改或提交 `D:\CodexProjects\haoyue-publisher`。

Run:

```powershell
D:\CodexProjects\lizhe-publisher\.venv\Scripts\python.exe -m pytest tests\test_douyin_publish_result.py -q
git -C 'D:\CodexProjects\lizhe-publisher\social-auto-upload' add sau_cli.py uploader\douyin_uploader\main.py tests\test_douyin_publish_result.py
git -C 'D:\CodexProjects\lizhe-publisher\social-auto-upload' commit -m 'feat: emit verified douyin publish evidence'
```

Expected: 测试 PASS；李哲发布器形成可追踪的独立补丁提交。

- [ ] **Step 4: 实现可注入执行器和超时处理**

正式调用使用：

```powershell
D:\CodexProjects\lizhe-publisher\.venv\Scripts\sau.exe douyin upload-video --account lizhe --file 'D:\CodexProjects\lizhe-publisher\snapshots\550e8400-e29b-41d4-a716-446655440000\抖音\视频\成片.mp4' --title '政策变化先看这三点' --desc '来源：深圳市教育局，发布日期：2026-08-13' --tags '深圳家长,升学规划' --headed
```

进程 `cwd` 固定为李哲发布器源码目录；不使用 shell；设总超时；保留 stdout/stderr 的脱敏副本。执行前后验证快照哈希和账号文件名。

- [ ] **Step 5: 运行发布适配器测试**

Run:

```powershell
pnpm test -- tests/publisher-command.test.mjs tests/publish-result.test.mjs tests/publisher-runner.test.mjs
```

Expected: PASS，且假执行器证明小红书分支零子进程、抖音参数没有 `--schedule`、只有结构化成功证据才是 `published`。

- [ ] **Step 6: 一次性可见浏览器登录（需要用户扫码）**

Run:

```powershell
D:\CodexProjects\lizhe-publisher\.venv\Scripts\sau.exe douyin login --account lizhe --headed
D:\CodexProjects\lizhe-publisher\.venv\Scripts\sau.exe douyin check --account lizhe
```

Expected: 用户扫码后 `check` 输出有效；cookies 位于李哲运行时，不在皓月体育运行时。

- [ ] **Step 7: 提交发布适配器**

```powershell
git add scripts src tests
git commit -m "feat: publish douyin immediately with verified evidence"
```

---

## Task 10: 发布回执、小红书提醒和一次性发布防重

**Files:**

- Create: `src/receipt.mjs`
- Create: `src/reminder.mjs`
- Create: `scripts/publish-now.mjs`
- Test: `tests/receipt.test.mjs`
- Test: `tests/reminder.test.mjs`
- Test: `tests/publish-now.test.mjs`

- [ ] **Step 1: 写回执状态和敏感信息脱敏测试**

回执目录：`D:\CodexProjects\lizhe-publisher\receipts\YYYY-MM-DD`。状态必须区分：`published`、`login_required`、`captcha_required`、`page_changed`、`publish_failed`、`publish_unknown`。回执不得包含 cookie、token、完整浏览器存储或豆包密钥。

- [ ] **Step 2: 写发布事务测试**

事务顺序：验证定稿 → 创建只读快照 → 再验证快照 → 检查账本无成功回执 → 写 `publish_in_progress` → 调用发布器 → 解析证据 → 写回执 → 再验源包 → 更新账本。进程崩溃后若存在 `publish_in_progress` 而无确定结果，状态必须进入 `publish_unknown`，不得自动重发。

- [ ] **Step 3: 实现小红书提醒但不上传**

提醒内容必须包含：主题、6–9 张图片数量、文案文件绝对路径、图片目录绝对路径、来源检查结果，以及明确文字“请在小红书 App 人工发布”。写入账本 `xiaohongshuStatus=reminded_manual_publish`。

通知由 Codex 自动任务最终消息完成；项目 CLI 只生成结构化 `notification.json`，不连接小红书、微信或第三方消息服务。

- [ ] **Step 4: 实现 `publish-now`**

正式 CLI 只接受已定稿包路径：

```powershell
pnpm publish:now -- --package 'C:\Users\Acer\Desktop\projects\创新学苑新媒体\产出\2026-08-18_主题'
```

若平台参数为小红书，直接输出 `manual_app_publish_required` 并返回非错误结果；不创建发布快照，不启动程序。

- [ ] **Step 5: 跑测试并提交**

```powershell
pnpm test -- tests/receipt.test.mjs tests/reminder.test.mjs tests/publish-now.test.mjs
pnpm verify
git add src scripts tests
git commit -m "feat: record safe receipts and manual xiaohongshu reminders"
```

Expected: 全部 PASS。

---

## Task 11: 完整干跑、视觉质检和首次受控发布

**Files:**

- Create: `tests/fixtures/controlled-week.json`
- Create: `docs/acceptance-checklist.md`
- Create: `docs/operations.md`
- Create: `scripts/qa-package.mjs`
- Test: `tests/qa-package.test.mjs`

- [ ] **Step 1: 写包级 QA 测试**

检查：源文件/脚本 ID/来源日期、合规报告、所有素材清单、视频 1080×1920/30–60 秒/30fps/音轨、SRT、烧录字幕文本、小红书 6–9 张 1080×1440、定稿哈希、无体育路径与品牌、无未授权人物、AI 声明字段。

- [ ] **Step 2: 运行全量自动验证**

Run:

```powershell
pnpm verify
pnpm produce -- --fixture tests/fixtures/controlled-week.json --dry-run
$dryRunPackage = (Get-ChildItem '.\产出' -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
node scripts/qa-package.mjs --package $dryRunPackage
```

Expected: 全部 PASS；账本状态最多到 `ready_to_publish`，没有发布回执和平台调用。

- [ ] **Step 3: 人工视觉/听觉验收**

逐项检查：李哲音色一致、无真人仿冒、首 3 秒钩子明确、政策来源和日期可读、字幕无遮挡、图文文字不溢出、公式正确、无体育视觉、无承诺性话术。记录结果到 `docs/acceptance-checklist.md`。

- [ ] **Step 4: 首次低风险正式发布前暂停并请求用户批准**

向用户展示：主题、来源、抖音标题、最终包路径、最终 SHA-256、视频预览、小红书图预览、合规报告、账号检查结果。必须得到用户明确“批准首次发布”后再继续。

- [ ] **Step 5: 执行首次即时发布并核验**

Run:

```powershell
$approvedPackage = (Get-ChildItem '.\产出' -Directory | Where-Object { Test-Path (Join-Path $_.FullName '.lizhe-finalized.json') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
pnpm publish:now -- --package $approvedPackage
```

Expected: 页面成功证据 + `published` 回执 + 账本 `douyinStatus=published`。若为任何其他状态，停止，不创建自动任务，不重试发布。

- [ ] **Step 6: 提交验收工具和文档**

```powershell
git add tests docs scripts
git commit -m "test: add controlled production acceptance workflow"
```

---

## Task 12: 更新上游内容规则并启用周二/周四自动任务

**Files:**

- Modify through Codex automation API: existing upstream automation `automation-3`
- Create through Codex automation API: one downstream Li Zhe production automation
- Create: `docs/automation-contract.md`

- [ ] **Step 1: 读取并备份现有自动任务配置**

使用 Codex 自动任务工具读取 `automation-3` 的当前标题、提示词、计划、工作目录和状态；把非敏感契约摘要写入 `docs/automation-contract.md`。不得手工编辑自动任务内部文件。

- [ ] **Step 2: 更新上游 `automation-3` 的李哲规则**

保留周五 20:00 和四人共 8 条脚本。李哲固定两条，优先级写入完整提示词：

1. 深圳/坪山/石井近期、可验证且会影响家长决策的政策或官方通知；
2. 升学规划、课程选择、学习阶段判断；
3. 数理化知识、解题思维、学习方法兜底。

政策必须有官方来源、发布日期、本地相关性和具体行动建议；没有有用政策时不得硬解读。输出仍为标准 DOCX，路径和文件名契约不变。

使用已安装的 `viral-short-form-ideas`、`viral-hooks`、`viral-captions-and-ctas` 和 `viral-tiktok-content` 作为选题、前三秒钩子、标题和短视频节奏框架；这些技能不得替代政策事实核验，也不得用来承诺流量。

- [ ] **Step 3: 创建一个周二/周四 09:00 的下游自动任务**

自动任务工作目录：`C:\Users\Acer\Desktop\projects\创新学苑新媒体`。完整提示词必须要求：

- 读取最近周五标准 DOCX，不读取旧周替代；
- 周二取李哲第 1 条，周四取第 2 条；
- 先运行 `pnpm produce`，再运行包级 QA；
- 仅在全部门禁通过且账本未发布时运行 `pnpm publish:now`；
- 抖音即时发布，绝不传 `--schedule`；
- 小红书只返回人工发布提醒和绝对路径；
- 任何登录、验证码、来源、合规、哈希、页面变化或结果不明问题立即停止并报告；
- 不读取或调用皓月体育内容、账号、素材、发布器或回执。

只有 Task 11 首次受控发布成功后，才把该任务设为启用。

- [ ] **Step 4: 做自动任务非发布验收**

先以禁用发布/干跑方式立即触发一次任务，确认它能找到正确周脚本、选择正确李哲序号、生成通知且不重复处理。然后查询自动任务状态，确认计划为每周二、周四 09:00（Asia/Shanghai），工作目录正确。

- [ ] **Step 5: 启用并记录最终契约**

在 `docs/automation-contract.md` 记录：上游任务 ID、下游任务 ID、两者计划、输入目录、输出目录、D 盘运行时、账号 `lizhe`、小红书人工发布规则、最后验证时间。不得记录 cookie 或密钥。

- [ ] **Step 6: 最终回归并提交文档**

```powershell
pnpm verify
git status --short
git add docs/automation-contract.md
git commit -m "docs: record lizhe automation operating contract"
```

Expected: 全量测试 PASS；Git 状态无意外文件；两个自动任务配置经 API 回读确认；新任务只在首次发布验收成功后处于启用状态。

---

## Final Acceptance Checklist

- [ ] 新项目和 Git 历史与皓月体育完全独立。
- [ ] 上游周五 20:00 输出契约已回读确认。
- [ ] 周二/周四只消费李哲第 1/2 条，且幂等防重有效。
- [ ] 政策内容有来源、日期、本地相关性和行动建议；无有效政策时使用规划/数理化兜底。
- [ ] 李哲豆包音色一致；Edge 仅试听，不能误发。
- [ ] 抖音视频通过尺寸、时长、字幕、音轨、素材和合规门禁。
- [ ] 小红书生成 6–9 张 1080×1440 图片，只提醒 App 人工发布。
- [ ] 旧教育资产只有白名单文件可用；体育路径、账号、品牌和素材全部拒绝。
- [ ] 本地生图失败不会阻塞真实素材/代码图形生产。
- [ ] 抖音使用独立 `lizhe` 账号、独立运行时、无 `--schedule`，且只有页面证据确认后才记 `published`。
- [ ] 首次干跑和首次受控发布均有验收记录。
- [ ] 周二/周四 09:00 自动任务已回读确认，重试不会重复发布。
