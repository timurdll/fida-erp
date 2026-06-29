'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  Calendar,
  Scale,
  BookOpen,
  MoreHorizontal,
  Users,
  BarChart2,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/store/auth.store'
import { useTheme } from '@/shared/lib/useTheme'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'

const PRIMARY = [
  { name: 'Заявки', href: '/journal', icon: FileText },
  { name: 'План', href: '/plan', icon: Calendar },
  { name: 'Отвесы', href: '/plumb', icon: Scale },
  { name: 'Справочники', href: '/dictionaries', icon: BookOpen },
]

const MORE_LINKS = [
  { name: 'Пользователи', href: '/users', icon: Users },
  { name: 'Отчёты', href: '/reports', icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearAuth, user } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) => pathname?.startsWith(href) ?? false
  const moreActive = MORE_LINKS.some((l) => isActive(l.href))

  const go = (href: string) => {
    setMoreOpen(false)
    router.push(href)
  }

  const itemCls = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 text-[10px] font-medium transition-colors',
      active ? 'text-primary' : 'text-muted-foreground',
    )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-sidebar-border bg-sidebar px-2 lg:hidden">
        {PRIMARY.map((item) => (
          <button key={item.href} onClick={() => go(item.href)} className={itemCls(isActive(item.href))}>
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
          </button>
        ))}
        <button onClick={() => setMoreOpen(true)} className={itemCls(moreActive || moreOpen)}>
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          Ещё
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-xl bg-sidebar">
          <SheetHeader>
            <SheetTitle>Ещё</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-4 pb-8">
            {MORE_LINKS.map((item) => (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  isActive(item.href) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </button>
            ))}

            <div className="my-2 border-t border-sidebar-border" />

            {user && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-foreground">
                  {user.fullName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.login}</p>
                </div>
              </div>
            )}

            <div className="my-2 border-t border-sidebar-border" />

            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </button>

            <button
              onClick={() => {
                setMoreOpen(false)
                clearAuth()
                router.push('/login')
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Выйти
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
