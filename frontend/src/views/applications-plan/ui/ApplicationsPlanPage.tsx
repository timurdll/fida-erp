'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Printer,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { DatePickerButton } from '@/shared/ui/date-picker-button'
import { MobileCard } from '@/shared/ui/mobile-card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import { getApplications } from '@/entities/application/api/applicationApi'
import type { Application } from '@/entities/application/model/types'
import {
  APP_STATUS_LABEL,
  getApplicationProgressDisplay,
  getApplicationTargetVolumeLabel,
  sortApplicationsWithWorkedLast,
} from '@/entities/application/model/types'
import { ApplicationProgressBar } from '@/features/applications/ui/ApplicationProgressBar'
import { printApplicationsPlan } from '../lib/printPlan'
import { toLocalDateString as toLocalDateStr } from '@/shared/utils/date'

// ─── date helpers (no date-fns) ──────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getMonday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  return r
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  const sameYear = monday.getFullYear() === sunday.getFullYear()
  if (sameMonth) {
    return `${monday.getDate()} — ${sunday.getDate()} ${sunday.toLocaleString('ru', { month: 'long' })} ${sunday.getFullYear()}`
  }
  if (sameYear) {
    return `${monday.getDate()} ${monday.toLocaleString('ru', { month: 'short' })} — ${sunday.getDate()} ${sunday.toLocaleString('ru', { month: 'short' })} ${sunday.getFullYear()}`
  }
  return `${monday.toLocaleDateString('ru')} — ${sunday.toLocaleDateString('ru')}`
}

// ─── status helpers ───────────────────────────────────────────────────────────

const CARD_CLASS: Record<Application['status'], string> = {
  PENDING: 'bg-primary/15 border-primary/30 hover:bg-primary/20',
  IN_PROGRESS: 'bg-warning/15 border-warning/30 hover:bg-warning/20',
  COMPLETED: 'bg-success/15 border-success/30 hover:bg-success/20',
  CANCELLED: 'bg-destructive/15 border-destructive/30 hover:bg-destructive/20',
}

const BADGE_CLASS: Record<Application['status'], string> = {
  PENDING: 'bg-primary/20 text-primary',
  IN_PROGRESS: 'bg-warning/20 text-warning',
  COMPLETED: 'bg-success/20 text-success',
  CANCELLED: 'bg-destructive/20 text-destructive',
}

// Визуальный статус с учётом прогресса (не только сырого application.status)
const DISPLAY_COLOR_VAR = {
  green: 'var(--success)',
  red: 'var(--destructive)',
  orange: 'var(--warning)',
  blue: 'var(--primary)',
  gray: 'var(--muted-foreground)',
} as const

function getDisplayStatus(app: Application) {
  if (app.status === 'COMPLETED') return { label: 'Выполнена', color: 'green' as const }
  if (app.status === 'CANCELLED') return { label: 'Отменена', color: 'red' as const }
  if ((app.progress?.loadingVolume ?? 0) > 0) return { label: 'На погрузке', color: 'orange' as const }
  if ((app.progress?.shippedVolume ?? 0) > 0) return { label: 'В процессе', color: 'blue' as const }
  return { label: 'Ожидает', color: 'gray' as const }
}

function DisplayStatusDot({ app }: { app: Application }) {
  const { label, color } = getDisplayStatus(app)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DISPLAY_COLOR_VAR[color] }} />
      {label}
    </span>
  )
}

// ─── Calendar constants ───────────────────────────────────────────────────────

const TIME_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]
const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// ─── CalendarCell ─────────────────────────────────────────────────────────────

function CalendarCell({
  apps,
  isToday,
  isLastColumn,
  time,
  dateStr,
  expanded,
  onAppClick,
  onAddClick,
}: {
  apps: Application[]
  isToday: boolean
  isLastColumn: boolean
  time: string
  dateStr: string
  expanded: boolean
  onAppClick: (id: number, date: string) => void
  onAddClick: (date: string, time: string) => void
}) {
  return (
    <div
      className={cn(
        'p-2 min-h-[70px] relative group flex flex-col gap-1',
        !isLastColumn && 'border-r border-border',
        isToday && 'bg-primary/[0.02]',
      )}
    >
      {apps.length > 0 ? (
        apps.map((app) => {
          const progress = getApplicationProgressDisplay(app)
          return (
          <Popover key={app.id}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  'rounded-md border p-2 cursor-pointer transition-colors',
                  CARD_CLASS[app.status],
                  expanded && 'p-3',
                )}
              >
                <p className={cn('font-medium text-foreground truncate', expanded ? 'text-sm' : 'text-xs')}>
                  {app.customer.type ? `${app.customer.type} ` : ""}{app.customer.name}
                </p>
                <p className={cn('text-muted-foreground truncate', expanded ? 'text-sm' : 'text-xs')}>
                  {app.object.name}
                </p>
                <div className={cn('flex items-center justify-between mt-1.5', expanded ? 'text-sm' : 'text-xs')}>
                  <span className="text-foreground font-medium">{getApplicationTargetVolumeLabel(app, 1)} м³</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', BADGE_CLASS[app.status])}>
                    {app.material.name}
                  </span>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-foreground truncate">{app.customer.type ? `${app.customer.type} ` : ""}{app.customer.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{app.object.name}</p>
                  </div>
                  <span className={cn('shrink-0 px-2 py-1 rounded text-xs font-medium', BADGE_CLASS[app.status])}>
                    {APP_STATUS_LABEL[app.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Объём</span>
                    <p className="font-medium text-foreground">{progress.targetVolumeLabel} м³</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Материал</span>
                    <p className="font-medium text-foreground">{app.material.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Время</span>
                    <p className="font-medium text-foreground">{app.deliveryTime ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Поставщик</span>
                    <p className="font-medium text-foreground truncate">{app.supplier.name}</p>
                  </div>
                </div>
              </div>
              <div className="p-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start"
                  onClick={() => onAppClick(app.id, dateStr)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Просмотр
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start"
                  onClick={() => window.location.assign('/plan/edit/' + app.id)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Изменить
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          )
        })
      ) : (
        <button
          onClick={() => onAddClick(dateStr, time)}
          className="absolute inset-2 rounded-md border border-dashed border-transparent hover:border-border hover:bg-background-elevated/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

interface CalendarViewProps {
  applications: Application[]
  onApplicationClick: (id: number, date: string) => void
  onAddClick: (date: string, time: string) => void
}

function CalendarView({ applications, onApplicationClick, onAddClick }: CalendarViewProps) {
  const todayStr = toLocalDateStr(new Date())
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const [calViewMode, setCalViewMode] = useState<'week' | 'day'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week',
  )
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(todayDate))
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
    const mon = getMonday(todayDate)
    return Math.max(0, Math.min(6, Math.floor((todayDate.getTime() - mon.getTime()) / 86_400_000)))
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const visibleDays = calViewMode === 'week' ? weekDays : [weekDays[selectedDayIdx]]

  const getAppsForSlot = (dateStr: string, slotTime: string): Application[] => {
    const slotHour = slotTime.split(':')[0]
    return sortApplicationsWithWorkedLast(
      applications.filter(
        (app) =>
          app.deliveryDate.slice(0, 10) === dateStr &&
          app.deliveryTime?.startsWith(slotHour + ':'),
      ),
    )
  }

  const getDayTotal = (dateStr: string) =>
    applications
      .filter((a) => a.deliveryDate.slice(0, 10) === dateStr)
      .reduce((s, a) => s + getApplicationProgressDisplay(a).total, 0)

  return (
    <div>
      {/* Calendar controls row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Week/Day toggle — скрыт на мобиле (там всегда день-режим) */}
        <div className="hidden items-center rounded-lg border border-border bg-background-elevated p-1 md:flex">
          <button
            onClick={() => setCalViewMode('week')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              calViewMode === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Неделя
          </button>
          <button
            onClick={() => setCalViewMode('day')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              calViewMode === 'day'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            День
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="bg-background-elevated border-border"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="bg-background-elevated border-border text-sm px-3"
            onClick={() => {
              const mon = getMonday(todayDate)
              setWeekStart(mon)
              setSelectedDayIdx(Math.max(0, Math.min(6, Math.floor((todayDate.getTime() - mon.getTime()) / 86_400_000))))
            }}
          >
            Сегодня
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium text-foreground px-2">
            {formatWeekRange(weekStart)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="bg-background-elevated border-border"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day selector */}
        {calViewMode === 'day' && (
          <Select value={String(selectedDayIdx)} onValueChange={(v) => setSelectedDayIdx(Number(v))}>
            <SelectTrigger className="w-[170px] bg-background-elevated border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekDays.map((d, i) => (
                <SelectItem key={i} value={String(i)}>
                  {DAY_NAMES_SHORT[i]} {d.getDate()} {d.toLocaleString('ru', { month: 'short' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `80px repeat(${visibleDays.length}, 1fr)` }}
        >
          <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border">
            Время
          </div>
          {visibleDays.map((d, i) => {
            const dateStr = toLocalDateStr(d)
            const isToday = dateStr === todayStr
            const dayIdx = calViewMode === 'week' ? i : selectedDayIdx
            const total = getDayTotal(dateStr)
            return (
              <div
                key={dateStr}
                className={cn(
                  'p-3 text-center',
                  i < visibleDays.length - 1 && 'border-r border-border',
                  isToday && 'bg-primary/5',
                )}
              >
                <div className={cn('text-sm font-medium', isToday ? 'text-primary' : 'text-foreground')}>
                  {DAY_NAMES_SHORT[dayIdx]} {d.getDate()}
                </div>
                {total > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">{total.toFixed(1)} м³</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Rows */}
        <div className="max-h-[calc(100vh-420px)] overflow-y-auto">
          {TIME_SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid border-b border-border last:border-0"
              style={{ gridTemplateColumns: `80px repeat(${visibleDays.length}, 1fr)` }}
            >
              <div className="p-3 text-sm text-muted-foreground border-r border-border min-h-[70px] flex items-start">
                {slot}
              </div>
              {visibleDays.map((d, i) => {
                const dateStr = toLocalDateStr(d)
                return (
                  <CalendarCell
                    key={dateStr}
                    apps={getAppsForSlot(dateStr, slot)}
                    isToday={dateStr === todayStr}
                    isLastColumn={i === visibleDays.length - 1}
                    time={slot}
                    dateStr={dateStr}
                    expanded={calViewMode === 'day'}
                    onAppClick={onApplicationClick}
                    onAddClick={onAddClick}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-4 text-sm">
        {[
          { label: 'Ожидает', cls: 'bg-primary/30' },
          { label: 'В процессе', cls: 'bg-warning/30' },
          { label: 'Завершена', cls: 'bg-success/30' },
          { label: 'Отменена', cls: 'bg-destructive/30' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-sm', cls)} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ApplicationsPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Дата хранится в URL (?date=YYYY-MM-DD), чтобы переживать переход на карточку и обратно
  const date = searchParams.get('date') ?? toLocalDateStr(new Date())
  const [showInactive, setShowInactive] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // replace, не push — чтобы смена даты не засоряла историю
  const handleDateChange = useCallback(
    (next: string) => router.replace(`/plan?date=${next}`, { scroll: false }),
    [router],
  )

  const { data: applications = [], isLoading } = useQuery({
    queryKey: applicationKeys.list({
      deliveryDate: viewMode === 'list' ? date : undefined,
      isActive: showInactive ? undefined : true,
    }),
    queryFn: () =>
      getApplications({
        deliveryDate: viewMode === 'list' ? date : undefined,
        isActive: showInactive ? undefined : true,
      }),
  })

  const totalShipped = applications.reduce((s, a) => s + a.progress.shippedVolume, 0)
  const totalLoading = applications.reduce((s, a) => s + getApplicationProgressDisplay(a).loading, 0)
  const totalRemain = applications.reduce((s, a) => s + getApplicationProgressDisplay(a).remain, 0)
  const listApplications = sortApplicationsWithWorkedLast(applications)

  // Format date for list view header (parse manually to avoid timezone shift)
  const [y, mo, d] = date.split('-').map(Number)
  const formattedDate = new Date(y, mo - 1, d).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {viewMode === 'list' ? `План заявок на ${formattedDate}` : 'План заявок'}
        </h1>

        {/* List / Calendar toggle */}
        <div className="flex items-center rounded-lg border border-border bg-background-elevated p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="h-4 w-4" />
            Список
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'calendar'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Календарь
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'list' && (
            <DatePickerButton
              value={date}
              onChange={handleDateChange}
              className="w-[180px]"
            />
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            Показать неактивные
          </label>
          <div className="flex gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="font-medium" style={{ color: 'var(--success)' }}>
                {totalShipped.toFixed(2)}
              </span>{' '}
              отгружено
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-medium" style={{ color: 'var(--warning)' }}>
                {totalLoading.toFixed(2)}
              </span>{' '}
              на погрузке
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalRemain.toFixed(2)}</span> осталось
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isLoading || applications.length === 0}
            onClick={() => printApplicationsPlan(listApplications, date)}
          >
            <Printer className="mr-2 h-4 w-4" />
            Распечатать
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => router.push('/plan/add')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить заявку
          </Button>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' && (
        <CalendarView
          applications={applications}
          onApplicationClick={(id, d) => router.push(`/plan/view/${id}?backDate=${d}`)}
          onAddClick={(date, time) => router.push(`/plan/add?date=${date}&time=${time}`)}
        />
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && (
        <>
        <div className="hidden rounded-lg border border-border bg-card md:block">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Статус</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Время</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Заказчик</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объект</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Материал</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Куб.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[160px]">
                      Прогресс
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Заявок на выбранную дату нет
                      </td>
                    </tr>
                  ) : (
                    listApplications.map((app, index) => {
                      const progress = getApplicationProgressDisplay(app)
                      return (
                      <tr
                        key={app.id}
                        className={cn(
                          'border-b border-border cursor-pointer transition-colors hover:bg-background-elevated',
                          index % 2 === 1 && 'bg-foreground/[0.02]',
                          !app.isActive && 'opacity-50',
                        )}
                        onClick={() => router.push(`/plan/view/${app.id}?backDate=${date}`)}
                      >
                        <td className="px-4 py-3">
                          <DisplayStatusDot app={app} />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {app.deliveryTime ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{app.customer.type ? `${app.customer.type} ` : ""}{app.customer.name}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{app.object.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {app.material.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {progress.targetVolumeLabel}
                        </td>
                        <td className="px-4 py-3">
                          <ApplicationProgressBar
                            shipped={progress.shipped}
                            loading={progress.loading}
                            total={progress.total}
                            completed={progress.isCompleted}
                            size="sm"
                            showText
                          />
                        </td>
                      </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cards — мобайл */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : listApplications.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              Заявок на выбранную дату нет
            </div>
          ) : (
            listApplications.map((app) => {
              const progress = getApplicationProgressDisplay(app)
              return (
              <MobileCard
                key={app.id}
                onClick={() => router.push(`/plan/view/${app.id}?backDate=${date}`)}
                muted={!app.isActive}
                title={app.customer.type ? `${app.customer.type} ${app.customer.name}` : app.customer.name}
                subtitle={app.object.name}
                badge={<DisplayStatusDot app={app} />}
                rows={[
                  { label: 'Время', value: app.deliveryTime ?? '—' },
                  { label: 'Материал', value: app.material.name },
                  { label: 'Объём', value: `${progress.targetVolumeLabel} м³` },
                ]}
              />
              )
            })
          )}
        </div>
        </>
      )}
    </div>
  )
}
