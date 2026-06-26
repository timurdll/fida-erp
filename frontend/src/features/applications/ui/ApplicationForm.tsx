'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { SearchableSelect, type SearchableOption } from '@/shared/ui/SearchableSelect'
import { CreateInlineDialog } from '@/shared/ui/create-inline-dialog'
import { cn } from '@/shared/lib/utils'
import { getCompanies, createCompany } from '@/entities/company/api/companyApi'
import { getObjects, createObject } from '@/entities/object/api/objectApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import { getConstructions } from '@/entities/construction/api/constructionApi'
import { getDeliveryMethods } from '@/entities/delivery-method/api/deliveryMethodApi'
import type { Company, CreateCompanyDto, CompanyFunction, CompanyType } from '@/entities/company/model/types'
import { CompanyFunctionLabel, CompanyTypeLabel } from '@/entities/company/model/types'
import type { ObjectItem, CreateObjectDto } from '@/entities/object/model/types'
import type { CreateApplicationDto } from '@/entities/application/model/types'
import { toLocalDateString as toLocalDateStr } from '@/shared/utils/date'

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

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

// ─── inline create forms ───────────────────────────────────────────────────────

const COMPANY_FUNCTIONS: CompanyFunction[] = ['CUSTOMER', 'SUPPLIER', 'ALL', 'OWN']
const COMPANY_TYPES: CompanyType[] = ['TOO', 'IP', 'CHL']

function CreateCustomerForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: Company) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateCompanyDto>({
    defaultValues: { function: 'CUSTOMER', type: 'TOO' },
  })

  const mutation = useMutation({
    mutationFn: (dto: CreateCompanyDto) => createCompany(dto),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Заказчик создан')
      onCreated(company)
    },
    onError: () => toast.error('Ошибка при создании заказчика'),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-foreground text-sm">Наименование <span className="text-destructive">*</span></Label>
        <Input
          className="bg-background-elevated border-border h-9"
          placeholder="Название компании"
          {...register('name', { required: true })}
        />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Функция</Label>
          <Controller
            name="function"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_FUNCTIONS.map((f) => (
                    <SelectItem key={f} value={f}>{CompanyFunctionLabel[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Тип</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{CompanyTypeLabel[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">БИН</Label>
          <Input className="bg-background-elevated border-border h-9" {...register('bin')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Телефон</Label>
          <Input className="bg-background-elevated border-border h-9" {...register('contactPhone')} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {mutation.isPending ? 'Создание...' : 'Создать'}
        </Button>
      </div>
    </form>
  )
}

function CreateObjectForm({
  customerId,
  customerName,
  onCreated,
  onCancel,
}: {
  customerId: number
  customerName: string
  onCreated: (o: ObjectItem) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; address?: string }>()

  const mutation = useMutation({
    mutationFn: (dto: CreateObjectDto) => createObject(dto),
    onSuccess: (object) => {
      queryClient.invalidateQueries({ queryKey: ['objects'] })
      toast.success('Объект создан')
      onCreated(object)
    },
    onError: () => toast.error('Ошибка при создании объекта'),
  })

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate({ ...d, companyId: customerId }))}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label className="text-foreground text-sm">Наименование <span className="text-destructive">*</span></Label>
        <Input
          className="bg-background-elevated border-border h-9"
          placeholder="Название объекта"
          {...register('name', { required: true })}
        />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-foreground text-sm">Заказчик</Label>
        <div className="h-9 rounded-md border border-border bg-muted/20 px-3 flex items-center text-sm text-muted-foreground">
          {customerName}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-foreground text-sm">Адрес</Label>
        <Input className="bg-background-elevated border-border h-9" {...register('address')} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {mutation.isPending ? 'Создание...' : 'Создать'}
        </Button>
      </div>
    </form>
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

  const queryClient = useQueryClient()
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const [showCreateObject, setShowCreateObject] = useState(false)

  const customerId = watch('customerId')
  const prevCustomerIdRef = useRef<number | undefined>(customerId)

  useEffect(() => {
    if (prevCustomerIdRef.current !== customerId) {
      setValue('objectId', undefined as any)
      prevCustomerIdRef.current = customerId
    }
  }, [customerId, setValue])

  // ── queries ──────────────────────────────────────────────────────────────

  // Поставщик — только своё юрлицо (OWN)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['companies', { function: 'OWN', isActive: true }],
    queryFn: () => getCompanies({ isActive: true, function: 'OWN' }),
    staleTime: 60_000,
  })
  // Заказчик — все компании (для лейбла выбранного значения)
  const { data: customers = [] } = useQuery({
    queryKey: ['companies', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
  })
  const customerName = customers.find((c) => c.id === customerId)?.name ?? ''

  const loadCustomers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCompanies({ isActive: true, search }).then((list) => list.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )
  const loadObjects = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      customerId
        ? getObjects({ companyId: customerId, isActive: true, search }).then((list) => list.map((o) => ({ id: o.id, label: o.name })))
        : Promise.resolve([]),
    [customerId],
  )
  // Материал — без типа OTHER (в заявках только бетон/сырьё)
  const loadMaterials = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getMaterials({ isActive: true, excludeType: 'OTHER', search }).then((list) => list.map((m) => ({ id: m.id, label: m.name }))),
    [],
  )
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
    <>
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
                  <SearchableSelect
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    loadOptions={loadCustomers}
                    placeholder="Выберите заказчика"
                    onCreateNew={() => setShowCreateCustomer(true)}
                    createLabel="Добавить заказчика"
                  />
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
                  <SearchableSelect
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    loadOptions={loadObjects}
                    disabled={!customerId}
                    placeholder={!customerId ? 'Сначала выберите заказчика' : 'Выберите объект'}
                    onCreateNew={customerId ? () => setShowCreateObject(true) : undefined}
                    createLabel="Добавить объект"
                  />
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
                  <SearchableSelect
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    loadOptions={loadMaterials}
                    placeholder="Выберите материал"
                  />
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
                      <Select value={mm} onValueChange={(v) => field.onChange(`${hh || '00'}:${v}`)}>
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

    <CreateInlineDialog
      open={showCreateCustomer}
      onOpenChange={setShowCreateCustomer}
      title="Новый заказчик"
    >
      <CreateCustomerForm
        onCreated={(company) => {
          setValue('customerId', company.id)
          setShowCreateCustomer(false)
        }}
        onCancel={() => setShowCreateCustomer(false)}
      />
    </CreateInlineDialog>

    {customerId && (
      <CreateInlineDialog
        open={showCreateObject}
        onOpenChange={setShowCreateObject}
        title="Новый объект"
      >
        <CreateObjectForm
          customerId={customerId}
          customerName={customerName}
          onCreated={(object) => {
            queryClient.invalidateQueries({ queryKey: ['objects'] })
            queryClient.invalidateQueries({ queryKey: ['objects', customerId] })
            setValue('objectId', object.id)
            setShowCreateObject(false)
          }}
          onCancel={() => setShowCreateObject(false)}
        />
      </CreateInlineDialog>
    )}
    </>
  )
}
