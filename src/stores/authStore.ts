import { create } from 'zustand'
import { api } from '@/lib/api.js'

export type Role = 'institution' | 'exam_admin' | 'proctor' | 'system'

export interface User {
  id: string
  username: string
  role: Role
  name: string
  phone: string
  institution_id: string | null
}

interface LoginResult {
  success: boolean
  error?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: async (username, password): Promise<LoginResult> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password })
    if (res.success && res.data) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      set({ token: res.data.token, user: res.data.user, isAuthenticated: true })
      return { success: true }
    }
    return { success: false, error: res.error || '登录失败' }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ token, user, isAuthenticated: true })
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  },
}))
