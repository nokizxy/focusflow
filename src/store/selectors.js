import { todayKey } from '../utils/date';

export function selectQueue(tasks) {
  return tasks
    .filter((task) => task.status !== 'done')
    .slice()
    .sort(compareQueueTasks);
}

export function selectTodayHistory(history) {
  const today = todayKey();
  return history.filter((item) => item.date === today);
}

export function compareQueueTasks(a, b) {
  const aPinned = a.focusPinnedAt || '';
  const bPinned = b.focusPinnedAt || '';
  if (aPinned || bPinned) return String(bPinned).localeCompare(String(aPinned));

  const today = todayKey();
  const aBucket = getScheduleBucket(a, today);
  const bBucket = getScheduleBucket(b, today);
  if (aBucket !== bBucket) return aBucket - bBucket;

  const aDeadline = getDateSortValue(a.deadlineDate || a.dueDate, today);
  const bDeadline = getDateSortValue(b.deadlineDate || b.dueDate, today);
  if (aDeadline !== bDeadline) return aDeadline - bDeadline;

  const aStart = getDateSortValue(a.startDate || a.dueDate, today);
  const bStart = getDateSortValue(b.startDate || b.dueDate, today);
  if (aStart !== bStart) return aStart - bStart;

  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

function getScheduleBucket(task, today) {
  const start = task.startDate || task.dueDate;
  if (task.scheduleType === 'someday' || !start || start === 'none') return 3;
  if (start === 'week') return 1;
  if (start <= today) return 0;
  return 2;
}

function getDateSortValue(value, today) {
  if (!value || value === 'none') return Number.MAX_SAFE_INTEGER;
  if (value === 'week') return dateToNumber(addDays(today, 6));
  return dateToNumber(value);
}

function dateToNumber(value) {
  const normalized = String(value || '').replaceAll('-', '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function addDays(dateKey, count) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + count);
  return date.toISOString().slice(0, 10);
}
