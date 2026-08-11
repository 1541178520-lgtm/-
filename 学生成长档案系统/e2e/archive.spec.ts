import { expect, test, type Page } from '@playwright/test';

const origin = 'http://localhost:5173';

async function createAdmin(page: Page) {
  const response = await page.request.post(`${origin}/api/setup/admin`, {
    headers: { origin, 'x-setup-secret': 'e2e-setup-secret' },
    data: { username: 'archive-admin', password: 'Archive123!' },
  });
  expect(response.ok()).toBeTruthy();
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('archive-admin');
  await page.getByLabel('密码').fill('Archive123!');
  await page.getByRole('button', { name: '登录档案系统' }).click();
  await expect(page.getByText('请选择一名学生')).toBeVisible();
}

async function addStudyRecord(page: Page, date: string, content: string) {
  await page.getByRole('button', { name: '新增晚辅记录' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('记录日期').fill(date);
  await dialog.getByLabel('晚辅反馈').fill(content);
  await dialog.getByRole('button', { name: '保存晚辅记录' }).click();
  await expect(dialog).toBeHidden();
}

async function addCourseRecord(page: Page, date: string, topic: string, feedback: string) {
  await page.getByRole('button', { name: '新增课程记录' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('日期').fill(date);
  await dialog.getByLabel('课程内容').fill(topic);
  await dialog.getByLabel('教师反馈').fill(feedback);
  await dialog.getByRole('button', { name: '保存课程记录' }).click();
  await expect(dialog).toBeHidden();
}

test.describe.serial('学生成长档案核心验收', () => {
  test('完整管理流程、持久化、权限和打印档案', async ({ page }) => {
    await createAdmin(page);
    await login(page);

    await page.getByRole('button', { name: /新增学生/ }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('姓名').fill('林晓雨');
    await dialog.getByLabel('年级').fill('初一');
    await dialog.getByLabel('学校').fill('青禾中学');
    await dialog.getByLabel('入学日期').fill('2026-03-01');
    await dialog.getByLabel('备注').fill('持续观察阅读习惯');
    await dialog.getByRole('button', { name: '保存学生' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/students\/\d+\/scores$/);
    await expect(page.getByTestId('grade-初一')).toContainText('林晓雨');

    await page.getByLabel('搜索学生').fill('晓雨');
    await expect(page.getByRole('link', { name: '林晓雨' })).toBeVisible();
    await page.getByLabel('搜索学生').fill('不存在');
    await expect(page.getByText('没有找到符合条件的学生')).toBeVisible();
    await page.getByLabel('搜索学生').fill('');

    await page.getByRole('button', { name: '管理学生标签' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('新标签名称').fill('重点关注');
    await dialog.getByRole('button', { name: '新增标签' }).click();
    await expect(dialog.getByText('重点关注', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: '完成' }).click();

    await page.getByRole('button', { name: '编辑资料' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('年级').fill('初二');
    await dialog.getByLabel('重点关注').check();
    await dialog.getByRole('button', { name: '保存修改' }).click();
    await expect(page.getByRole('heading', { name: '林晓雨' })).toBeVisible();
    await expect(page.getByText('重点关注', { exact: true })).toBeVisible();
    await expect(page.getByTestId('grade-初二')).toContainText('林晓雨');

    const scoreRows = [
      ['阶段测验', '2026-04-10', '88', '92', '阶段性进步'],
      ['期中考试', '2026-05-15', '91', '95', '计算更稳定'],
      ['期末考试', '2026-07-01', '96', '98', '保持复盘节奏'],
    ] as const;
    for (const [exam, date, chinese, math, remark] of scoreRows) {
      await page.getByRole('button', { name: /新增成绩/ }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByLabel('考试名称').fill(exam);
      await dialog.getByLabel('考试日期').fill(date);
      await dialog.getByLabel('语文').fill(chinese);
      await dialog.getByLabel('数学').fill(math);
      await dialog.getByLabel('备注').fill(remark);
      await dialog.getByRole('button', { name: '保存成绩' }).click();
      await expect(dialog).toBeHidden();
    }
    const scoreCards = page.locator('.score-card');
    await expect(scoreCards).toHaveCount(3);
    await expect(scoreCards.nth(0)).toContainText('阶段测验');
    await expect(scoreCards.nth(2)).toContainText('期末考试');

    await page.getByRole('button', { name: '编辑期中考试' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('数学').fill('99');
    await dialog.getByRole('button', { name: '保存修改' }).click();
    await expect(scoreCards.nth(1)).toContainText('99');
    await page.getByRole('button', { name: '删除阶段测验' }).click();
    await page.getByRole('button', { name: '确认删除成绩' }).click();
    await expect(scoreCards).toHaveCount(2);
    await page.reload();
    await expect(scoreCards).toHaveCount(2);
    await expect(scoreCards.nth(0)).toContainText('期中考试');

    await page.getByRole('link', { name: '晚辅' }).click();
    for (let index = 1; index <= 10; index += 1) {
      await addStudyRecord(page, `2026-06-${String(index).padStart(2, '0')}`, `晚辅记录 ${index}：完成阅读与错题复盘。`);
    }
    await expect(page.getByText('第 10 页 / 共 10 页')).toBeVisible();
    await page.getByRole('button', { name: '上一页' }).click();
    await expect(page.getByText('晚辅记录 9：完成阅读与错题复盘。')).toBeVisible();
    await page.getByRole('button', { name: '编辑本页' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('记录日期').fill('2026-05-01');
    await dialog.getByRole('button', { name: '保存修改' }).click();
    await expect(page.getByText('第 1 页 / 共 10 页')).toBeVisible();
    await page.reload();
    await expect(page.getByText('第 1 页 / 共 10 页')).toBeVisible();
    await expect(page.getByText('晚辅记录 9：完成阅读与错题复盘。')).toBeVisible();

    await page.getByRole('link', { name: '课程' }).click();
    await page.getByRole('link', { name: '数学', exact: true }).click();
    for (let index = 1; index <= 5; index += 1) {
      await addCourseRecord(page, `2026-07-${String(index).padStart(2, '0')}`, `数学专题 ${index}`, `数学反馈 ${index}`);
    }
    await expect(page.getByText('第 5 页 / 共 5 页')).toBeVisible();
    await page.getByRole('link', { name: '英语', exact: true }).click();
    for (let index = 1; index <= 3; index += 1) {
      await addCourseRecord(page, `2026-07-${String(index + 5).padStart(2, '0')}`, `英语专题 ${index}`, `英语反馈 ${index}`);
    }
    await expect(page.getByText('第 3 页 / 共 3 页')).toBeVisible();
    await page.getByRole('link', { name: '物理', exact: true }).click();
    for (let index = 1; index <= 2; index += 1) {
      await addCourseRecord(page, `2026-07-${String(index + 8).padStart(2, '0')}`, `物理专题 ${index}`, `物理反馈 ${index}`);
    }
    await expect(page.getByText('第 2 页 / 共 2 页')).toBeVisible();
    await page.getByRole('link', { name: '数学', exact: true }).click();
    await expect(page.getByText('第 1 页 / 共 5 页')).toBeVisible();
    await expect(page.getByText('数学反馈 1')).toBeVisible();
    await expect(page.getByText('英语反馈 3')).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'test-results/visual/desktop-main.png', fullPage: true });

    await page.getByRole('link', { name: '打印档案' }).click();
    await expect(page.getByRole('heading', { name: '学生成长档案', exact: true })).toBeVisible();
    await expect(page.getByText('期中考试')).toBeVisible();
    await expect(page.getByText('晚辅记录 10：完成阅读与错题复盘。')).toBeVisible();
    await expect(page.getByRole('heading', { name: '数学课程档案' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '英语课程档案' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '物理课程档案' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '剑桥课程档案' })).toHaveCount(0);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('navigation', { name: '打印操作' })).toBeHidden();
    await page.pdf({ path: 'test-results/student-growth-archive.pdf', format: 'A4', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    await page.screenshot({ path: 'test-results/visual/desktop-print.png', fullPage: true });

    await page.getByRole('link', { name: /返回学生档案/ }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { name: '林晓雨' })).toBeVisible();
    await expect(page.locator('.score-card')).toHaveCount(2);
    await page.screenshot({ path: 'test-results/visual/mobile-main.png' });
    await page.getByRole('button', { name: '学生目录', exact: true }).click();
    await expect(page.getByRole('complementary', { name: '学生档案目录' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: '学生档案目录' })).toHaveClass(/is-open/);
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'test-results/visual/mobile-directory.png' });
    await page.getByRole('button', { name: '关闭学生目录' }).first().click();
    await expect(page.getByRole('complementary', { name: '学生档案目录' })).not.toHaveClass(/is-open/);
    await page.waitForTimeout(250);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/visual/tablet-main.png' });

    await page.getByRole('button', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/login$/);
    const getResponse = await page.request.get(`${origin}/api/students`);
    expect(getResponse.status()).toBe(401);
    const postResponse = await page.request.post(`${origin}/api/students`, {
      headers: { origin },
      data: { name: '越权学生', grade: '初一', school: '', join_date: '', remark: '' },
    });
    expect(postResponse.status()).toBe(401);
  });
});
