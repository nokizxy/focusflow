export function getApiBase() {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') return '';

  const { hostname, port } = window.location;
  const isLocalDevHost = hostname === '127.0.0.1' || hostname === 'localhost';
  const isReactDevServer = ['3000', '3004', '3031'].includes(port);

  return isLocalDevHost && isReactDevServer ? 'http://127.0.0.1:8787' : '';
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`;
}
