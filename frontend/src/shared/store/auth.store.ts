import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/shared/types/user'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => {
        set({ token, user })
        if (typeof document !== 'undefined') {
          document.cookie = 'is_authed=1; path=/; max-age=604800'
        }
      },

      clearAuth: () => {
        set({ token: null, user: null })
        if (typeof document !== 'undefined') {
          document.cookie = 'is_authed=; path=/; max-age=0'
        }
      },

      isAdmin: () => {
        return get().user?.role === 'ADMIN'
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Sync cookie after rehydration from localStorage
        if (state?.token && typeof document !== 'undefined') {
          document.cookie = 'is_authed=1; path=/; max-age=604800'
        }
      },
    },
  ),
)
