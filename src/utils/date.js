export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatReviewDate(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function secondsToRoundedMinutes(seconds) {
  return Math.max(1, Math.round(seconds / 60));
}

export function formatClockTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}
