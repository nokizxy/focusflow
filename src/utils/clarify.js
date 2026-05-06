export function getClarifyOptions(question = '') {
  const source = String(question || '').trim();
  const afterDash = source.includes('——') ? source.split('——').pop() : source;
  const afterQuestion = afterDash.includes('？') ? afterDash.split('？').pop() : afterDash;
  const options = afterQuestion
    .split('/')
    .flatMap((item) => item.split(/，|,|：|:/).map((part) => part.trim()))
    .map((item) => item.replace(/[。？?]/g, '').trim())
    .filter((item) => item && !/说一个词|具体|哪一种|什么/.test(item))
    .slice(0, 6);

  return options.length ? options : ['数学题', '读书报告', '论文', '编程', '其他'];
}

export function buildClarifiedTitle(originalTitle, option) {
  const title = String(originalTitle || '').trim();
  const answer = String(option || '').trim();

  if (/写作业|作业/.test(title)) return `写${answer}`;
  if (/做\s*PPT|PPT/i.test(title)) return `${title}：${answer}`;
  if (/学习|学一下/.test(title)) return `学习${answer}`;
  if (/整理/.test(title)) return `${title}：${answer}`;
  if (/写文章|文章/.test(title)) return `写${answer}`;
  return `${title}：${answer}`;
}
