import { Sidebar } from '@/widgets/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-[220px]">{children}</main>
    </div>
  )
}
