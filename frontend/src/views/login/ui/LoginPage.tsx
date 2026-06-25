'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'
import { Label } from '@/shared/ui/label'
import { loginApi } from '@/shared/api/auth'
import { useAuthStore } from '@/shared/store/auth.store'

export function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [isLoading, setIsLoading] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await loginApi(login, password)
      setAuth(data.accessToken, data.user)
      router.push('/journal')
    } catch {
      toast.error('Неверный логин или пароль')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #3a8dff 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative mx-4 w-full max-w-[420px]">
        <div className="rounded-xl border border-border bg-card p-10 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-primary">FIDA ERP</h1>
            <p className="text-sm text-muted-foreground">Система управления отгрузками</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm text-muted-foreground">
                Логин
              </Label>
              <Input
                id="login"
                type="text"
                placeholder="Введите логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="h-11 border-border bg-background-elevated text-foreground placeholder:text-muted-foreground/60"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Пароль
              </Label>
              <PasswordInput
                id="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-border bg-background-elevated text-foreground placeholder:text-muted-foreground/60"
                required
              />
            </div>

            <Button
              type="submit"
              className="mt-2 h-11 w-full bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">© 2026 FIDA Concrete</p>
      </div>
    </div>
  )
}
