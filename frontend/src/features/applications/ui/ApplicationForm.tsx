'use client'

import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Building2, Truck, Wrench, CalendarIcon, Clock } from 'lucide-react'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { cn } from '@/shared/lib/utils'
import { getCompanies } from '@/entities/company/api/companyApi'
import { getObjects } from '@/entities/object/api/objectApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import { getConstructions } from '@/entities/construction/api/constructionApi'
import { getDeliveryMethods } from '@/entities/delivery-method/api/deliveryMethodApi'
import type { CreateApplicationDto } from '@/entities/application/model/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
}

const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

// ─── sub-components ───────────────────────────────────────────────────────────

/** Section header: small icon badge + title */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  )
}

/** Number input with a visually-separated inline unit suffix */
function UnitInput({
  unit,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className={cn('flex h-9 w-full overflow-hidden rounded-md border border-border bg-background-elevated shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50', className)}>
      <input
        type="number"
        className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <div className="flex items-center px-2.5 border-l border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {unit}
        </span>
      </div>
    </div>
  )
}

// ─── types ────────────────────────────────────────────────────────────────────

interface ApplicationFormProps {
  defaultValues?: Partial<CreateApplicationDto>
  onSubmit: (data: CreateApplicationDto) => void
  isLoading?: boolean
  submitLabel?: string
  onCancel?: () => void
}

// ─── component ───────────────────────────────────────────────────────────────

export function ApplicationForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Добавить в план отгрузки',
  onCancel,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateApplicationDto>({
    defaultValues: {
      deliveryDate: toLocalDateStr(new Date()),
      loadingInterval: 30,
      ...defaultValues,
    },
  })

  const customerId = watch('customerId')
  const prevCustomerIdRef = useRef<number | undefined>(customerId)

  useEffect(() => {
    if (prevCustomerIdRef.current !== customerId) {
      setValue('objectId', undefined as any)
      prevCustomerIdRef.current = customerId
    }
  }, [customerId, setValue])

  // ── queries ──────────────────────────────────────────────────────────────

  const { data: suppliers = [] } = useQuery({
    queryKey: ['companies', { function: 'SUPPLIER', isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['companies', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  })
  const { data: objects = [] } = useQuery({
    queryKey: ['objects', { companyId: customerId, isActive: true }],
    queryFn: () => getObjects({ companyId: customerId, isActive: true }),
    enabled: !!customerId,
    staleTime: 30_000,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
  })
  const { data: constructions = [] } = useQuery({
    queryKey: ['constructions', { isActive: true }],
    queryFn: () => getConstructions({ isActive: true }),
    staleTime: 60_000,
  })
  const { data: deliveryMethods = [] } = useQuery({
    queryKey: ['delivery-methods', { isActive: true }],
    queryFn: () => getDeliveryMethods({ isActive: true }),
    staleTime: 60_000,
  })

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Sections share one card, divided by border-b */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">

        {/* ── 1. Общие данные ─────────────────────────────────────────── */}
        <div className="p-5">
          <SectionHeader icon={Building2} title="Общие данные" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Поставщик */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Поставщик <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="supplierId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                      <SelectValue placeholder="Выберите поставщика" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierId && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>

            {/* Заказчик */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Заказчик <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="customerId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                      <SelectValue placeholder="Выберите заказчика" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>

            {/* Объект */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Объект <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="objectId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    disabled={!customerId}
                    value={field.value?.toString()}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className={cn('w-full bg-background-elevated border-border h-9', !customerId && 'opacity-50')}>
                      <SelectValue placeholder={!customerId ? 'Сначала выберите заказчика' : 'Выберите объект'} />
                    </SelectTrigger>
                    <SelectContent>
                      {objects.map((o) => (
                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {!customerId
                ? <p className="text-xs text-muted-foreground">Сначала выберите заказчика</p>
                : errors.objectId && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>

            {/* Материал */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Материал <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="materialId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                      <SelectValue placeholder="Выберите материал" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.materialId && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>
          </div>
        </div>

        {/* ── 2. Логистика доставки ───────────────────────────────────── */}
        <div className="p-5">
          <SectionHeader icon={Truck} title="Логистика доставки" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Целевой объём */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Целевой объём <span className="text-destructive">*</span>
              </Label>
              <UnitInput
                unit="м³"
                min="0.5"
                step="0.5"
                placeholder="0.00"
                {...register('targetVolume', { required: true, valueAsNumber: true, min: 0.01 })}
              />
              {errors.targetVolume && <p className="text-xs text-destructive">{'Обязательное поле (> 0)'}</p>}
            </div>

            {/* Интервал погрузки */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Интервал погрузки <span className="text-destructive">*</span>
              </Label>
              <UnitInput
                unit="мин"
                min="1"
                placeholder="30"
                {...register('loadingInterval', { required: true, valueAsNumber: true, min: 1 })}
              />
              {errors.loadingInterval && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>

            {/* Дата + Время — unified row feel via same height */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Дата доставки <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="deliveryDate"
                control={control}
                rules={{ required: true }}
                render={({ field }) => {
                  const dateObj = field.value ? parseDateStr(field.value) : undefined
                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full h-9 justify-start text-left font-normal bg-background-elevated border-border',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">
                            {dateObj ? formatDisplayDate(dateObj) : 'Выберите дату'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateObj}
                          onSelect={(d) => field.onChange(d ? toLocalDateStr(d) : '')}
                        />
                      </PopoverContent>
                    </Popover>
                  )
                }}
              />
              {errors.deliveryDate && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">
                Время подачи <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="deliveryTime"
                control={control}
                rules={{ required: true }}
                render={({ field }) => {
                  const parts = (field.value ?? '').split(':')
                  const hh = parts[0] ?? ''
                  const mm = parts[1] ?? ''
                  return (
                    <div className="flex items-center gap-1.5 w-fit">
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={hh} onValueChange={(v) => field.onChange(`${v}:${mm || '00'}`)}>
                          <SelectTrigger className="w-24 h-9 bg-background-elevated border-border pl-9">
                            <SelectValue placeholder="Час" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-muted-foreground font-medium">:</span>
                      <Select value={mm} onValueChange={(v) => field.onChange(`${hh || '06'}:${v}`)}>
                        <SelectTrigger className="w-20 h-9 bg-background-elevated border-border">
                          <SelectValue placeholder="Мин" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}
              />
              {errors.deliveryTime && <p className="text-xs text-destructive">Обязательное поле</p>}
            </div>
          </div>
        </div>

        {/* ── 3. Технические детали ───────────────────────────────────── */}
        <div className="p-5">
          <SectionHeader icon={Wrench} title="Технические детали" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {/* Row 1: Способ приёмки | Тип конструкции */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Способ приёмки</Label>
              <Controller
                name="deliveryMethodId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}
                  >
                    <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {deliveryMethods.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Тип конструкции</Label>
              <Controller
                name="constructionId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}
                  >
                    <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                      <SelectValue placeholder="Не указан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {constructions.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Row 2: Осадка конуса | Примечания */}
            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Осадка конуса</Label>
              <UnitInput
                unit="см"
                min="0"
                step="0.5"
                placeholder="—"
                {...register('slumpCone', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground text-sm">Примечания</Label>
              <Textarea
                placeholder="Дополнительная информация о заявке..."
                className="bg-background-elevated border-border resize-none h-9 py-2 min-h-0"
                rows={1}
                {...register('note')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Actions ── */}
      <div className="flex items-center justify-end gap-3 mt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            Назад
          </Button>
        )}
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isLoading}
        >
          {isLoading ? 'Сохранение...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
