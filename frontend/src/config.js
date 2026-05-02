const currentAPI = 'https://adds-conducting-collectible-electronics.trycloudflare.com';

export const API = currentAPI;
export default API;

/**
 * Fetch wrapper that auto-injects JWT Authorization header.
 * Use this instead of raw fetch() for all authenticated API calls.
 */
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('vortice_token');
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  headers['ngrok-skip-browser-warning'] = 'true';
  return fetch(url, { ...options, headers });
}

/**
 * Fire-and-forget analytics event.
 */
export function track(event, data = {}) {
  const user = localStorage.getItem('vortice_user') || undefined;
  fetch(`${API}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ event, user, data }),
  }).catch(() => {});
}
