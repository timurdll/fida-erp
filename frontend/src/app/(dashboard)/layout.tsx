import { Sidebar } from '@/widgets/sidebar'
import { BottomNav } from '@/widgets/bottom-nav'
import { ScaleProvider } from '@/shared/lib/ScaleProvider'
import { ScaleIndicator } from '@/shared/ui/scale-indicator'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScaleProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="pb-16 lg:pb-0 lg:pl-[220px]">
          {/* Индикатор весов вверху страницы — только на мобиле/планшете (на десктопе он в сайдбаре) */}
          <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-card px-4 py-2">
            <ScaleIndicator />
          </div>
          {children}
        </main>
        <BottomNav />
      </div>
    </ScaleProvider>
  )
}
