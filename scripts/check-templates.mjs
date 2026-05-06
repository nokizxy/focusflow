import { getCommonTaskBreakdown } from '../server/commonTaskBreakdowns.mjs';

const cases = [
  '洗澡',
  '刷牙',
  '吃药',
  '倒垃圾',
  '叠衣服',
  '做饭',
  '买菜',
  '写周报',
  '回邮件',
  '看书',
  '复习考试',
  '整理答辩任务：PPT内容',
  '整理答辩演示稿'
];

const forbidden = /整理桌面|打扫环境|做准备工作|复盘总结|加油|你可以的|相信自己/;
let failures = 0;

for (const title of cases) {
  const result = getCommonTaskBreakdown({ title, spiceLevel: 2 });
  if (!result) {
    fail(title, '没有命中模板');
    continue;
  }

  const [first] = result.steps;
  const last = result.steps[result.steps.length - 1];
  const minutes = new Set(result.steps.map((step) => step.minutes));
  const joined = result.steps.map((step) => `${step.title}${step.detail}`).join('\n');

  if (!first?.isMicroStart) fail(title, '第一步没有标记 isMicroStart');
  if (!last?.isWinningLine || !/做到这里|算赢|赢/.test(`${last.title}${last.detail}`)) {
    fail(title, '最后一步不是胜利线');
  }
  if (result.steps.length > 5) fail(title, '步骤超过 5 步');
  if (minutes.size === 1 && result.steps.length > 1) fail(title, '步骤时长完全相同');
  if (forbidden.test(joined)) fail(title, '出现禁词或拖延型步骤');
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Template check passed: ${cases.length} cases`);

function fail(title, message) {
  failures += 1;
  console.error(`[${title}] ${message}`);
}
