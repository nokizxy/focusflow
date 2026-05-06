export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getTomorrowInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
}

export function normalizeDueDate(value) {
  if (!value || value === 'none') return 'none';
  if (value === 'today') return toDateInputValue();
  if (value === 'tomorrow') return getTomorrowInputValue();
  if (value === 'week') return 'week';
  return value;
}

export function formatDueDate(value) {
  if (!value || value === 'none') return '不设日期';
  if (value === 'week') return '本周';

  const today = toDateInputValue();
  const tomorrow = getTomorrowInputValue();
  if (value === today) return '今天';
  if (value === tomorrow) return '明天';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}
