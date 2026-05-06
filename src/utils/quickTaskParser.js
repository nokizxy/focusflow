import { normalizeDueDate } from './taskMeta';

const durationPattern = /(?:^|\s)(\d{1,3})\s*(?:分钟|min|m)(?=\s|$)/i;

export function parseQuickTaskText(rawText) {
  const source = String(rawText || '').trim();
  const tagMatch = source.match(/#([\p{Script=Han}\w-]+)/u);
  const durationMatch = source.match(durationPattern);
  const deadlineToken = detectDeadlineDate(source);
  const startToken = detectStartDate(source, deadlineToken?.raw || '');

  let title = source
    .replace(/#([\p{Script=Han}\w-]+)/gu, ' ')
    .replace(durationPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (deadlineToken) {
    title = title
      .replace(deadlineToken.raw, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (startToken) {
    title = title
      .replace(startToken.raw, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    title,
    tag: tagMatch?.[1] || '',
    startDate: startToken ? normalizeDueDate(startToken.value) : '',
    deadlineDate: deadlineToken ? normalizeDueDate(deadlineToken.value) : '',
    minutes: durationMatch ? clampMinutes(Number(durationMatch[1])) : null
  };
}

function detectDeadlineDate(text) {
  const tokens = [
    { pattern: /(今天截止|截止今天)/, value: 'today' },
    { pattern: /(明天截止|截止明天)/, value: 'tomorrow' },
    { pattern: /(本周截止|这周截止|截止本周|截止这周)/, value: 'week' }
  ];

  for (const token of tokens) {
    const match = text.match(token.pattern);
    if (match) return { raw: match[1], value: token.value };
  }

  return null;
}

function detectStartDate(text, deadlineRaw = '') {
  const withoutDeadline = deadlineRaw ? text.replace(deadlineRaw, ' ') : text;
  const tokens = [
    { pattern: /(今天开始|今天做|今天)/, value: 'today' },
    { pattern: /(明天开始|明天做|明天)/, value: 'tomorrow' },
    { pattern: /(本周开始|这周开始|本周做|这周做|本周|这周)/, value: 'week' }
  ];

  for (const token of tokens) {
    const match = withoutDeadline.match(token.pattern);
    if (match) return { raw: match[1], value: token.value };
  }

  return null;
}

function clampMinutes(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(180, Math.max(1, value));
}
