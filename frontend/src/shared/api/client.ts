const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Lazily import store to avoid circular deps and SSR issues
  let token: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const { useAuthStore } = await import('@/shared/store/auth.store')
      token = useAuthStore.getState().token
    } catch {
      // ignore
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      try {
        const { useAuthStore } = await import('@/shared/store/auth.store')
        useAuthStore.getState().clearAuth()
      } catch {
        // ignore
      }
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'API request failed')
  }

  // Handle empty responses (e.g. DELETE 204)
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
