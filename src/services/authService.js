import { apiUrl } from './apiBase';

async function requestAuth(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '认证请求失败。');
  return data;
}

export function fetchCurrentUser() {
  return requestAuth('/api/auth/me');
}

export function loginUser({ email, password }) {
  return requestAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function registerUser({ email, password, displayName }) {
  return requestAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName })
  });
}

export function logoutUser() {
  return requestAuth('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({})
  });
}
