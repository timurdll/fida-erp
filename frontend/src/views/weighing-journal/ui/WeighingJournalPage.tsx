'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Scale, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { DatePickerButton } from '@/shared/ui/date-picker-button'
import { Skeleton } from '@/shared/ui/skeleton'
import { plumbLogKeys } from '@/entities/plumb-log/model/queryKeys'
import { getPlumbLogs } from '@/entities/plumb-log/api/plumbLogApi'
import { getCompanies } from '@/entities/company/api/companyApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import type { PlumbLog } from '@/entities/plumb-log/model/types'

const fmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return fmt.format(new Date(iso))
}

function kg(val: number | null) {
  if (val === null) return '—'
  return val.toLocaleString('ru-RU') + ' кг'
}

function sumTonnes(logs: PlumbLog[], field: keyof Pick<PlumbLog, 'tare' | 'gross' | 'net'>) {
  const total = logs.reduce((s, l) => s + (l[field] ?? 0), 0)
  return (total / 1000).toFixed(3) + ' т'
}

export function WeighingJournalPage() {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [isActive, setIsActive] = useState<boolean | undefined>(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending'>('all')
  const [supplierId, setSupplierId] = useState<number | undefined>()
  const [materialId, setMaterialId] = useState<number | undefined>()

  const { data: plumbLogs = [], isLoading } = useQuery({
    queryKey: plumbLogKeys.list({ dateFrom, dateTo, isActive, supplierId, materialId }),
    queryFn: () => getPlumbLogs({ dateFrom, dateTo, isActive, supplierId, materialId }),
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials', { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
  })

  const filtered = plumbLogs.filter((l) => {
    if (statusFilter === 'done') return l.gross !== null
    if (statusFilter === 'pending') return l.gross === null
    return true
  })

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Журнал отвесов</h1>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => router.push('/plumb/new')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить отвес
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={isActive === true}
              onChange={(e) => setIsActive(e.target.checked ? true : undefined)}
            />
            Активные
          </label>
          <label className="text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={isActive === false}
              onChange={(e) => setIsActive(e.target.checked ? false : undefined)}
            />
            Неактивные
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">От</span>
          <DatePickerButton
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Начало"
            clearable
            className="w-[160px]"
          />
          <span className="text-sm text-muted-foreground">До</span>
          <DatePickerButton
            value={dateTo}
            onChange={setDateTo}
            placeholder="Конец"
            clearable
            className="w-[160px]"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px] bg-background-elevated border-border h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="done">Завершённые</SelectItem>
            <SelectItem value="pending">В процессе</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={supplierId ? String(supplierId) : 'all'}
          onValueChange={(v) => setSupplierId(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[200px] bg-background-elevated border-border h-9">
            <SelectValue placeholder="Поставщик" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все поставщики</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={materialId ? String(materialId) : 'all'}
          onValueChange={(v) => setMaterialId(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[180px] bg-background-elevated border-border h-9">
            <SelectValue placeholder="Материал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все материалы</SelectItem>
            {materials.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Дата-время</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Поставщик</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Заказчик</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Материал</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Гос.номер</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Тара, кг</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Брутто, кг</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Нетто, кг</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Отвесы не найдены
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => router.push('/plumb/view/' + log.id)}
                    className={`border-b border-border transition-colors hover:bg-background-elevated cursor-pointer ${
                      i % 2 === 1 ? 'bg-white/[0.02]' : ''
                    } ${log.gross === null ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-primary">#{log.id}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{fmtDate(log.firstWeighingAt)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{log.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{log.customer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{log.material?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {log.transport?.plateNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{kg(log.tare)}</td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{kg(log.gross)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{kg(log.net)}</td>
                  </tr>
                ))
              )}
              {filtered.length > 0 && (
                <tr className="border-t-2 border-border bg-background-elevated">
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                    Итого ({filtered.length} записей)
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    {sumTonnes(filtered, 'tare')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    {sumTonnes(filtered, 'gross')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                    {sumTonnes(filtered, 'net')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
