'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { DateTimePickerButton } from '@/shared/ui/date-time-picker-button'
import { getCompanies } from '@/entities/company/api/companyApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import { getCarriers } from '@/entities/carrier/api/carrierApi'
import { getObjects } from '@/entities/object/api/objectApi'
import { CompanyTypeLabel } from '@/entities/company/model/types'
import type { CompanyType } from '@/entities/company/model/types'
import {
  fetchReportBlob,
  fetchReportPreview,
  reportFilename,
} from '@/entities/report/api/reportApi'
import type { ReportFilters } from '@/entities/report/api/reportApi'
import {
  buildReportPreviewDocument,
  REPORT_LOADING_HTML,
} from '@/entities/report/lib/reportPreviewDocument'
import {
  OTVESY_TYPES,
  REPORT_FILTER_CONFIG,
  REPORT_LABELS,
  ZAYAVKI_TYPES,
} from '@/entities/report/model/types'
import type { FilterKey, ReportType } from '@/entities/report/model/types'

interface Props {
  tab: 'otvesy' | 'zayavki'
}

interface FilterState {
  supplierId?: number
  customerId?: number
  materialId?: number
  carrierId?: number
  objectId?: number
  supplierType?: CompanyType
  customerType?: CompanyType
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return d
}

export function ReportFilterPanel({ tab }: Props) {
  const types = tab === 'otvesy' ? OTVESY_TYPES : ZAYAVKI_TYPES
  const [type, setType] = useState<ReportType>(types[0])
  const [dateFrom, setDateFrom] = useState<Date>(startOfToday)
  const [dateTo, setDateTo] = useState<Date>(endOfToday)
  const [filters, setFilters] = useState<FilterState>({})
  const [isGenerating, setIsGenerating] = useState(false)

  const activeKeys = REPORT_FILTER_CONFIG[type]

  // Только фильтры, релевантные текущему типу отчёта
  function activeFilters(): ReportFilters {
    const result: ReportFilters = {}
    for (const key of activeKeys) {
      const val = filters[key as keyof FilterState]
      if (val !== undefined) {
        (result as Record<string, unknown>)[key] = val
      }
    }
    return result
  }

  // Отвесы: Поставщик = все компании, Заказчик = OWN
  // Заявки:  Поставщик = OWN,          Заказчик = все компании
  const loadSuppliers = useCallback(
    (search: string) =>
      getCompanies({
        isActive: true,
        search: search || undefined,
        function: tab === 'zayavki' ? 'OWN' : undefined,
      }).then((data) => data.map((c) => ({ id: c.id, label: c.name }))),
    [tab],
  )

  const loadCustomers = useCallback(
    (search: string) =>
      getCompanies({
        isActive: true,
        search: search || undefined,
        function: tab === 'otvesy' ? 'OWN' : undefined,
      }).then((data) => data.map((c) => ({ id: c.id, label: c.name }))),
    [tab],
  )

  const loadMaterials = useCallback(
    (search: string) =>
      getMaterials({ isActive: true, search: search || undefined }).then((data) =>
        data.map((m) => ({ id: m.id, label: m.name })),
      ),
    [],
  )

  const loadCarriers = useCallback(
    (search: string) =>
      getCarriers({ isActive: true, search: search || undefined }).then((data) =>
        data.map((c) => ({ id: c.id, label: c.name })),
      ),
    [],
  )

  const loadObjects = useCallback(
    (search: string) =>
      getObjects({ isActive: true, search: search || undefined }).then((data) =>
        data.map((o) => ({ id: o.id, label: o.name })),
      ),
    [],
  )

  function setFilter(key: FilterKey, value: number | CompanyType | undefined) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setDateFrom(startOfToday())
    setDateTo(endOfToday())
    setFilters({})
  }

  async function handleGenerate() {
    if (dateFrom > dateTo) {
      toast.error('Дата начала не может быть позже даты окончания')
      return
    }

    // Открываем вкладку СИНХРОННО в обработчике клика — иначе блокировщик попапов
    // отменит window.open после await.
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Разрешите всплывающие окна для просмотра отчёта')
      return
    }
    win.document.write(REPORT_LOADING_HTML)

    const filtersSnapshot = activeFilters()
    setIsGenerating(true)
    try {
      // Параллельно: JSON для таблицы + .xlsx blob для кнопки «Скачать».
      const [result, blob] = await Promise.all([
        fetchReportPreview(type, dateFrom, dateTo, filtersSnapshot),
        fetchReportBlob(type, dateFrom, dateTo, filtersSnapshot),
      ])
      const blobUrl = URL.createObjectURL(blob)
      const filename = reportFilename(type, dateFrom, dateTo)
      const html = buildReportPreviewDocument(result, { blobUrl, filename })
      win.document.open()
      win.document.write(html)
      win.document.close()
    } catch (err) {
      win.close()
      toast.error(err instanceof Error ? err.message : 'Ошибка формирования отчёта')
    } finally {
      setIsGenerating(false)
    }
  }

  const isValid = dateFrom <= dateTo
  const companyTypeOptions = Object.entries(CompanyTypeLabel) as [CompanyType, string][]

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      {/* Тип отчёта */}
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Тип отчёта</Label>
        <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {REPORT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Диапазон дат */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">
            Дата с <span className="text-destructive">*</span>
          </Label>
          <DateTimePickerButton value={dateFrom} onChange={setDateFrom} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">
            Дата по <span className="text-destructive">*</span>
          </Label>
          <DateTimePickerButton value={dateTo} onChange={setDateTo} className="w-full" />
        </div>
      </div>

      {/* Динамические фильтры */}
      {activeKeys.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {activeKeys.includes('supplierId') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Поставщик</Label>
              <SearchableSelect
                value={filters.supplierId}
                onChange={(v) => setFilter('supplierId', v)}
                loadOptions={loadSuppliers}
                placeholder="Все поставщики"
              />
            </div>
          )}

          {activeKeys.includes('customerId') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Заказчик</Label>
              <SearchableSelect
                value={filters.customerId}
                onChange={(v) => setFilter('customerId', v)}
                loadOptions={loadCustomers}
                placeholder="Все заказчики"
              />
            </div>
          )}

          {activeKeys.includes('materialId') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Материал</Label>
              <SearchableSelect
                value={filters.materialId}
                onChange={(v) => setFilter('materialId', v)}
                loadOptions={loadMaterials}
                placeholder="Все материалы"
              />
            </div>
          )}

          {activeKeys.includes('carrierId') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Перевозчик</Label>
              <SearchableSelect
                value={filters.carrierId}
                onChange={(v) => setFilter('carrierId', v)}
                loadOptions={loadCarriers}
                placeholder="Все перевозчики"
              />
            </div>
          )}

          {activeKeys.includes('objectId') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Объект</Label>
              <SearchableSelect
                value={filters.objectId}
                onChange={(v) => setFilter('objectId', v)}
                loadOptions={loadObjects}
                placeholder="Все объекты"
              />
            </div>
          )}

          {activeKeys.includes('supplierType') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Тип поставщика</Label>
              <Select
                value={filters.supplierType ?? 'all'}
                onValueChange={(v) =>
                  setFilter('supplierType', v === 'all' ? undefined : (v as CompanyType))
                }
              >
                <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {companyTypeOptions.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeKeys.includes('customerType') && (
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Тип заказчика</Label>
              <Select
                value={filters.customerType ?? 'all'}
                onValueChange={(v) =>
                  setFilter('customerType', v === 'all' ? undefined : (v as CompanyType))
                }
              >
                <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {companyTypeOptions.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Кнопки */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !isValid}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Формирование...
            </>
          ) : (
            'Сформировать'
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={resetFilters}
          disabled={isGenerating}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Сбросить
        </Button>
        {!isValid && (
          <span className="text-xs text-destructive">
            Дата начала позже даты окончания
          </span>
        )}
      </div>
    </div>
  )
}
