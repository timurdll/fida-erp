'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  Calendar,
  Scale,
  Users,
  BookOpen,
  BarChart2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/store/auth.store'

const navigation: { name: string; href: string; icon: React.ElementType }[] = [
  { name: 'Журнал заявок', href: '/journal', icon: FileText },
  { name: 'План заявок', href: '/plan', icon: Calendar },
  { name: 'Журнал отвесов', href: '/plumb', icon: Scale },
  { name: 'Пользователи', href: '/users', icon: Users },
  { name: 'Справочники', href: '/dictionaries', icon: BookOpen },
  { name: 'Отчёты', href: '/reports', icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearAuth, user } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/journal" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">FIDA</span>
            <span className="text-sm font-medium text-muted-foreground">ERP</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname?.startsWith(item.href) ?? false
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? '-ml-px border-l-2 border-primary bg-sidebar-accent pl-[11px] text-sidebar-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-3">
          {user && (
            <div className="mb-1 px-3 py-1.5">
              <p className="text-xs font-medium text-foreground truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.login}</p>
            </div>
          )}
          <button
            onClick={() => { clearAuth(); router.push('/login') }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Выйти
          </button>
        </div>
      </div>
    </aside>
  )
}
