import { apiUrl } from './apiBase';

export async function breakdownTaskWithAI({ task, spiceLevel = task?.spiceLevel || 2, context = '' }) {
  const response = await fetch(apiUrl('/api/ai-breakdown'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: task.title,
      notes: context || task.notes || '',
      spiceLevel
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `AI 请求失败：${response.status}`);
  }

  return data;
}
