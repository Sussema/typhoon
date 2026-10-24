export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const activeRole = typeof window !== 'undefined' ? localStorage.getItem('cl_active_role') : null;
  const reqHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(activeRole ? { 'x-role': activeRole } : {}),
    ...headers
  };

  const res = await fetch(`/api${path}`, {
    method,
    headers: Object.keys(reqHeaders).length > 0 ? reqHeaders : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin' // sends the session cookie
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  }
  return data;
}
