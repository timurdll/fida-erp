'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import {
  getApplications,
  getApplicationById,
  completeApplication,
  deactivateApplication,
} from '@/entities/application/api/applicationApi'
import type { Application, PlumbLogSummary } from '@/entities/application/model/types'
import { ApplicationProgressBar } from '@/features/applications/ui/ApplicationProgressBar'
import { getMaterials } from '@/entities/material/api/materialApi'

function StatusDot({ status }: { status: Application['status'] }) {
  const colors: Record<Application['status'], string> = {
    PENDING: 'var(--muted-foreground)',
    IN_PROGRESS: 'var(--warning)',
    COMPLETED: 'var(--success)',
    CANCELLED: 'var(--destructive)',
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: colors[status] }}
    />
  )
}

function PlumbStatus({ gross }: { gross: number | null }) {
  return gross === null ? (
    <span className="text-xs font-medium" style={{ color: 'var(--warning)' }}>В пути</span>
  ) : (
    <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Отгружено</span>
  )
}

function AccordionRow({
  applicationId, onEdit, onComplete, onDeactivate,
}: {
  applicationId: number
  onEdit: () => void
  onComplete: () => void
  onDeactivate: () => void
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => getApplicationById(applicationId),
    staleTime: 15_000,
  })
  const plumbs: PlumbLogSummary[] = detail?.plumbLogs ?? []
  return (
    <tr>
      <td colSpan={7} className="bg-background-elevated/50 px-4 pb-4 pt-2">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>Редактировать</Button>
          <Button size="sm" variant="outline"
            onClick={() => { if (window.confirm('Завершить заявку досрочно?')) onComplete() }}>
            Завершить досрочно
          </Button>
          <Button size="sm" variant="destructive"
            onClick={() => { if (window.confirm('Деактивировать заявку?')) onDeactivate() }}>
            Деактивировать
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : plumbs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Отвесов пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['ID', 'Авто', 'Водитель', '1е взвешивание', '2е взвешивание', 'БСУ', 'Куб.', 'Статус'].map(h => (
                    <th key={h} className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plumbs.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted-foreground">{p.id}</td>
                    <td className="py-2 pr-4">{p.transport?.plateNumber ?? '—'}</td>
                    <td className="py-2 pr-4">{p.driver?.fullName ?? '—'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {p.firstWeighingAt ? new Date(p.firstWeighingAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {p.secondWeighingAt ? new Date(p.secondWeighingAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.bsuNumber ?? '—'}</td>
                    <td className="py-2 pr-4">{p.volume != null ? p.volume.toFixed(2) : '—'}</td>
                    <td className="py-2"><PlumbStatus gross={p.gross} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  )
}

export function ApplicationsJournalPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [materialId, setMaterialId] = useState<number | undefined>()
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: applications = [], isLoading } = useQuery({
    queryKey: applicationKeys.list({ deliveryDate: date, isActive: true, materialId }),
    queryFn: () => getApplications({ deliveryDate: date, isActive: true, materialId }),
    refetchInterval: 30_000,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials', { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
  })

  const totalShipped = applications.reduce((s, a) => s + a.progress.shippedVolume, 0)
  const totalLoading = applications.reduce((s, a) => s + a.progress.loadingVolume, 0)
  const totalPlan = applications.reduce((s, a) => s + a.targetVolume, 0)

  const completeMutation = useMutation({
    mutationFn: completeApplication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }); toast.success('Заявка завершена'); setExpandedId(null) },
    onError: () => toast.error('Ошибка при завершении заявки'),
  })
  const deactivateMutation = useMutation({
    mutationFn: deactivateApplication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }); toast.success('Заявка деактивирована'); setExpandedId(null) },
    onError: () => toast.error('Ошибка при деактивации'),
  })

  const formattedDate = new Intl.DateTimeFormat('ru', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date + 'T00:00:00'))

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Журнал заявок</h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span className="capitalize">{formattedDate}</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { label: 'Отгружено', value: totalShipped, color: 'var(--success)' },
          { label: 'В процессе', value: totalLoading, color: 'var(--warning)' },
          { label: 'План', value: totalPlan, color: undefined },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg px-4 py-3 bg-muted">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color ?? 'var(--muted-foreground)' }} />
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold text-foreground">
                {value.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">м³</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-10 rounded-md border border-border bg-background-elevated px-3 text-sm text-foreground"
        />
        <Button variant="outline" size="sm" onClick={() => setDate(today)}>Сегодня</Button>
        <Select value={materialId?.toString() ?? 'all'} onValueChange={v => setMaterialId(v === 'all' ? undefined : Number(v))}>
          <SelectTrigger className="w-[200px] bg-background-elevated border-border">
            <SelectValue placeholder="Все материалы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все материалы</SelectItem>
            {materials.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-12 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Время</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Заказчик</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объект</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Материал</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объём</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[180px]">Прогресс</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Заявок на выбранную дату нет</td></tr>
                ) : (
                  applications.flatMap((app, index) => [
                    <tr
                      key={app.id}
                      className={`border-b border-border cursor-pointer transition-colors hover:bg-background-elevated ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={app.status} />
                          {expandedId === app.id
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{app.deliveryTime ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{app.customer.name}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{app.object.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{app.material.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{app.targetVolume.toFixed(2)} м³</td>
                      <td className="px-4 py-3">
                        <ApplicationProgressBar shipped={app.progress.shippedVolume} loading={app.progress.loadingVolume} total={app.targetVolume} showText size="sm" />
                      </td>
                    </tr>,
                    ...(expandedId === app.id ? [
                      <AccordionRow
                        key={`acc-${app.id}`}
                        applicationId={app.id}
                        onEdit={() => router.push('/plan/edit/' + app.id)}
                        onComplete={() => completeMutation.mutate(app.id)}
                        onDeactivate={() => deactivateMutation.mutate(app.id)}
                      />
                    ] : []),
                  ])
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
