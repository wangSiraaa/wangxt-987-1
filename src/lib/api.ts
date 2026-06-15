const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string; errors?: string[]; warnings?: string[] }> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } })
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; return { success: false, error: '未登录' } }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
