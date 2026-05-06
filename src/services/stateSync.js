import { apiUrl } from './apiBase';

export async function fetchServerState() {
  const response = await fetch(apiUrl('/api/state'), {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('读取后端状态失败。');
  return response.json();
}

export async function saveServerState(state) {
  const response = await fetch(apiUrl('/api/state'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(state)
  });

  if (!response.ok) throw new Error('保存后端状态失败。');
}
