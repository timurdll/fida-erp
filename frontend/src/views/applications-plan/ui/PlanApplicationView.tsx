'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import { getApplicationById, completeApplication, deactivateApplication } from '@/entities/application/api/applicationApi'
import { APP_STATUS_LABEL } from '@/entities/application/model/types'
import { ApplicationProgressBar } from '@/features/applications/ui/ApplicationProgressBar'

interface Props {
  id: number
  backDate?: string
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value ?? '—'}</span>
    </div>
  )
}

export function PlanApplicationView({ id, backDate }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const backHref = backDate ? `/plan?date=${backDate}` : '/plan'
  // URL текущей карточки — чтобы из отвеса можно было вернуться сюда (с датой, если есть)
  const selfUrl = backDate ? `/plan/view/${id}?backDate=${backDate}` : `/plan/view/${id}`

  const { data: app, isLoading } = useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => getApplicationById(id),
    enabled: !!id,
  })

  const completeMutation = useMutation({
    mutationFn: () => completeApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) })
      toast.success('Заявка завершена')
      router.push('/plan')
    },
    onError: () => toast.error('Ошибка при завершении'),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      toast.success('Заявка деактивирована')
      router.push('/plan')
    },
    onError: () => toast.error('Ошибка при деактивации'),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-muted-foreground">Заявка не найдена</p>
        <Button variant="ghost" onClick={() => router.push(backHref)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />Вернуться к плану
        </Button>
      </div>
    )
  }

  const plumbs = app.plumbLogs ?? []

  return (
    <div className="min-h-screen p-6">
      {/* Breadcrumb */}
      <button
        onClick={() => router.push(backHref)}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Вернуться к плану
      </button>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Заявка №{app.id}</h1>
        <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{
          backgroundColor: app.status === 'COMPLETED' ? 'color-mix(in srgb, var(--success) 15%, transparent)' :
            app.status === 'IN_PROGRESS' ? 'color-mix(in srgb, var(--warning) 15%, transparent)' :
            app.status === 'CANCELLED' ? 'color-mix(in srgb, var(--destructive) 15%, transparent)' :
            'var(--muted)',
          color: app.status === 'COMPLETED' ? 'var(--success)' :
            app.status === 'IN_PROGRESS' ? 'var(--warning)' :
            app.status === 'CANCELLED' ? 'var(--destructive)' :
            'var(--muted-foreground)',
        }}>
          {APP_STATUS_LABEL[app.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Info */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Общие данные
            </h2>
            <InfoRow label="Поставщик" value={app.supplier.name} />
            <InfoRow label="Заказчик" value={app.customer.name} />
            <InfoRow label="Объект" value={app.object.name} />
            <InfoRow label="Материал" value={app.material.name} />
            <InfoRow label="Автор заявки" value={app.author.fullName} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Логистика
            </h2>
            <InfoRow label="Дата доставки" value={new Date(app.deliveryDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('ru')} />
            <InfoRow label="Время подачи" value={app.deliveryTime} />
            <InfoRow label="Интервал погрузки" value={app.loadingInterval ? `${app.loadingInterval} мин` : null} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Технические данные
            </h2>
            <InfoRow label="Конструкция" value={app.construction?.name} />
            <InfoRow label="Способ приёмки" value={app.deliveryMethod?.name} />
            <InfoRow label="Осадка конуса" value={app.slumpCone} />
            <InfoRow label="Примечание" value={app.note} />
          </div>
        </div>

        {/* Right — Progress + Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Прогресс отгрузки
            </h2>
            <ApplicationProgressBar
              shipped={app.progress.shippedVolume}
              loading={app.progress.loadingVolume}
              total={app.targetVolume}
              size="lg"
            />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Отгружено</span>
                <span className="font-medium" style={{ color: 'var(--success)' }}>
                  {app.progress.shippedVolume.toFixed(2)} м³
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">На погрузке</span>
                <span className="font-medium" style={{ color: 'var(--warning)' }}>
                  {app.progress.loadingVolume.toFixed(2)} м³
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Осталось</span>
                <span className="font-medium text-foreground">{app.progress.remainVolume.toFixed(2)} м³</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Целевая кубатура</span>
                <span className="font-semibold text-foreground">{app.targetVolume.toFixed(2)} м³</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Действия
            </h2>
            {app.status === 'COMPLETED' ? (
              <p className="text-sm text-success">Заявка выполнена</p>
            ) : app.status === 'CANCELLED' ? (
              <p className="text-sm text-destructive">Заявка деактивирована</p>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/plumb/new?applicationId=' + id)}
                >
                  + Добавить взвешивание
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/plan/edit/' + id)}
                >
                  Редактировать заявку
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={completeMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Завершить заявку досрочно?')) completeMutation.mutate()
                  }}
                >
                  Завершить досрочно
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={deactivateMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Деактивировать заявку? Это действие нельзя отменить.')) deactivateMutation.mutate()
                  }}
                >
                  Деактивировать
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plumb logs */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Журнал отвесов{plumbs.length > 0 ? ` (${plumbs.length})` : ''}
        </h2>
        {plumbs.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Отвесов пока нет
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['ID', 'Гос. номер', 'Водитель', '1е взвешивание', '2е взвешивание', 'БСУ', 'Куб.', 'Тара', 'Брутто', 'Нетто'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plumbs.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-border cursor-pointer hover:bg-primary/5 transition-colors ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => router.push(`/plumb/view/${p.id}?backUrl=${encodeURIComponent(selfUrl)}&backLabel=${encodeURIComponent('Заявка №' + id)}`)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{p.id}</td>
                    <td className="px-4 py-3">{p.transport?.plateNumber ?? '—'}</td>
                    <td className="px-4 py-3">{p.driver?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.firstWeighingAt ? new Date(p.firstWeighingAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.secondWeighingAt ? new Date(p.secondWeighingAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.bsu?.name ?? '—'}</td>
                    <td className="px-4 py-3">{p.volume != null ? p.volume.toFixed(2) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.tare ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.gross ?? '—'}</td>
                    <td className="px-4 py-3">{p.net != null ? p.net : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
