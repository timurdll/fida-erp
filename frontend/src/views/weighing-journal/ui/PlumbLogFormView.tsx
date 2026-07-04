'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { SearchableSelect, type SearchableOption } from '@/shared/ui/SearchableSelect'
import { CreateInlineDialog } from '@/shared/ui/create-inline-dialog'
import { plumbLogKeys } from '@/entities/plumb-log/model/queryKeys'
import { createPlumbLog, weighTare, weighGross } from '@/entities/plumb-log/api/plumbLogApi'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import { getApplicationById } from '@/entities/application/api/applicationApi'
import { ApplicationProgressBar } from '@/features/applications/ui/ApplicationProgressBar'
import { getCompanies, createCompany } from '@/entities/company/api/companyApi'
import { getMaterials, createMaterial } from '@/entities/material/api/materialApi'
import { getTransports, createTransport } from '@/entities/transport/api/transportApi'
import { getDrivers, createDriver } from '@/entities/driver/api/driverApi'
import { getCarriers, createCarrier } from '@/entities/carrier/api/carrierApi'
import { getBsuList } from '@/entities/bsu/api/bsuApi'
import { getNomenclatures } from '@/entities/nomenclature/api/nomenclatureApi'
import { getConstructions, createConstruction } from '@/entities/construction/api/constructionApi'
import type { CreatePlumbLogDto } from '@/entities/plumb-log/model/types'
import type { CreateDriverDto, Driver } from '@/entities/driver/model/types'
import type { CreateTransportDto, Transport } from '@/entities/transport/model/types'
import type { CreateConstructionDto, Construction } from '@/entities/construction/model/types'
import type { Carrier, CreateCarrierDto } from '@/entities/carrier/model/types'
import type { Company, CreateCompanyDto, CompanyFunction, CompanyType } from '@/entities/company/model/types'
import { CompanyFunctionLabel, CompanyTypeLabel } from '@/entities/company/model/types'
import type { Material, CreateMaterialDto } from '@/entities/material/model/types'
import { isValidSlumpCone } from '@/shared/utils/slumpCone'
import { useScaleStore } from '@/shared/store/scaleStore'

interface Props {
  applicationId?: number
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{children}</h3>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="h-9 rounded-md border border-border bg-muted/30 px-3 flex items-center text-sm text-foreground">
        {value || '—'}
      </div>
    </div>
  )
}

// ─── inline create forms ────────────────────────────────────────────────────────

const COMPANY_FUNCTIONS: CompanyFunction[] = ['CUSTOMER', 'SUPPLIER', 'ALL', 'OWN']
const COMPANY_TYPES: CompanyType[] = ['TOO', 'IP', 'CHL']

function CreateCompanyForm({
  defaultFunction,
  onCreated,
  onCancel,
}: {
  defaultFunction: CompanyFunction
  onCreated: (c: Company) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateCompanyDto>({
    defaultValues: { function: defaultFunction, type: 'TOO' },
  })
  const mutation = useMutation({
    mutationFn: (dto: CreateCompanyDto) => createCompany(dto),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['companies-own'] })
      toast.success('Компания создана')
      onCreated(company)
    },
    onError: () => toast.error('Ошибка при создании компании'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Наименование <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="Название компании" {...register('name', { required: true })} />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Функция</Label>
          <Controller name="function" control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{CompanyFunctionLabel[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Тип</Label>
          <Controller name="type" control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-background-elevated border-border h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{CompanyTypeLabel[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">БИН</Label>
          <Input className="bg-background-elevated border-border h-9" {...register('bin')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Телефон</Label>
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

function CreateMaterialForm({
  onCreated,
  onCancel,
}: {
  onCreated: (m: Material) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  // Материалы этой формы — только тип «Прочее» (сырьё), поэтому type зашит в OTHER.
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateMaterialDto>({
    defaultValues: { type: 'OTHER' },
  })
  const mutation = useMutation({
    mutationFn: (dto: CreateMaterialDto) => createMaterial(dto),
    onSuccess: (material) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Материал создан')
      onCreated(material)
    },
    onError: () => toast.error('Ошибка при создании материала'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Наименование <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="Щебень, песок и т.п." {...register('name', { required: true })} />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Плотность (т/м³)</Label>
        <Controller name="density" control={control}
          render={({ field }) => (
            <Input type="number" step="0.01" className="bg-background-elevated border-border h-9" placeholder="0.00"
              value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
          )} />
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

function CreateDriverForm({
  onCreated,
  onCancel,
}: {
  onCreated: (d: Driver) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateDriverDto>()
  const mutation = useMutation({
    mutationFn: (dto: CreateDriverDto) => createDriver(dto),
    onSuccess: (driver) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      toast.success('Водитель создан')
      onCreated(driver)
    },
    onError: () => toast.error('Ошибка при создании водителя'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">ФИО водителя <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="Иванов Иван Иванович" {...register('fullName', { required: true })} />
        {errors.fullName && <p className="text-xs text-destructive">Обязательное поле</p>}
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

function CreateCarrierForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: Carrier) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateCarrierDto>()
  const mutation = useMutation({
    mutationFn: (dto: CreateCarrierDto) => createCarrier(dto),
    onSuccess: (carrier) => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] })
      toast.success('Перевозчик создан')
      onCreated(carrier)
    },
    onError: () => toast.error('Ошибка при создании перевозчика'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Наименование <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="Название перевозчика" {...register('name', { required: true })} />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Примечание</Label>
        <Input className="bg-background-elevated border-border h-9" {...register('note')} />
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

function CreateConstructionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: Construction) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<CreateConstructionDto>()
  const mutation = useMutation({
    mutationFn: (dto: CreateConstructionDto) => createConstruction(dto),
    onSuccess: (construction) => {
      queryClient.invalidateQueries({ queryKey: ['constructions'] })
      toast.success('Конструкция создана')
      onCreated(construction)
    },
    onError: () => toast.error('Ошибка при создании конструкции'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Наименование <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="Название конструкции" {...register('name', { required: true })} />
        {errors.name && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Примечание</Label>
        <Input className="bg-background-elevated border-border h-9" {...register('note')} />
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

function CreateTransportForm({
  onCreated,
  onCancel,
}: {
  onCreated: (t: Transport, driverId?: number, carrierId?: number) => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateTransportDto>()

  const loadDrivers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getDrivers({ isActive: true, search }).then((list) => list.map((d) => ({ id: d.id, label: d.fullName }))),
    [],
  )
  const loadCarriers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCarriers({ isActive: true, search }).then((list) => list.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )

  const mutation = useMutation({
    mutationFn: (dto: CreateTransportDto) => createTransport(dto),
    onSuccess: (transport, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transports'] })
      toast.success('Транспорт создан')
      onCreated(transport, variables.driverId, variables.carrierId)
    },
    onError: () => toast.error('Ошибка при создании транспорта'),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Гос. номер <span className="text-destructive">*</span></Label>
        <Input className="bg-background-elevated border-border h-9" placeholder="845 WQA 01" {...register('plateNumber', { required: true })} />
        {errors.plateNumber && <p className="text-xs text-destructive">Обязательное поле</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Тара (кг)</Label>
        <Controller name="tare" control={control}
          render={({ field }) => (
            <Input type="number" className="bg-background-elevated border-border h-9" placeholder="0"
              value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
          )} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Водитель</Label>
        <Controller name="driverId" control={control}
          render={({ field }) => (
            <SearchableSelect value={field.value} onChange={(id) => field.onChange(id)} loadOptions={loadDrivers} placeholder="Выберите водителя" />
          )} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm text-foreground">Перевозчик</Label>
        <Controller name="carrierId" control={control}
          render={({ field }) => (
            <SearchableSelect value={field.value} onChange={(id) => field.onChange(id)} loadOptions={loadCarriers} placeholder="Выберите перевозчика" />
          )} />
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

export function PlumbLogFormView({ applicationId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isConcrete = !!applicationId

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreatePlumbLogDto>({
    defaultValues: { applicationId },
  })

  const transportId = watch('transportId')
  const supplierId = watch('supplierId')

  const { data: application } = useQuery({
    queryKey: applicationKeys.detail(applicationId!),
    queryFn: () => getApplicationById(applicationId!),
    enabled: isConcrete,
  })

  const { data: transports = [] } = useQuery({
    queryKey: ['transports', { isActive: true }],
    queryFn: () => getTransports({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: bsuList = [] } = useQuery({
    queryKey: ['bsu', { isActive: true }],
    queryFn: () => getBsuList({ isActive: true }),
    enabled: isConcrete,
    staleTime: 60_000,
  })

  const { data: nomenclatures = [] } = useQuery({
    queryKey: ['nomenclatures', { isActive: true }],
    queryFn: () => getNomenclatures({ isActive: true }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  useEffect(() => {
    if (application) {
      setValue('supplierId', application.supplierId)
      setValue('customerId', application.customerId)
      setValue('materialId', application.materialId)
      setValue('objectId', application.objectId)
      // Осадка конуса и конструкция подтягиваются из заявки (можно переопределить вручную)
      if (application.slumpCone != null) setValue('slumpCone', application.slumpCone)
      if (application.constructionId != null) setValue('constructionId', application.constructionId)
    }
  }, [application, setValue])

  useEffect(() => {
    if (!transportId) return
    const t = transports.find((tr) => tr.id === transportId)
    if (t) {
      if (t.driver) setValue('driverId', t.driver.id)
      if (t.carrier) setValue('carrierId', t.carrier.id)
    }
  }, [transportId, transports, setValue])

  const [tare, setTare] = useState('')
  const [gross, setGross] = useState('')
  const [tareConfirmed, setTareConfirmed] = useState(false)
  const [grossConfirmed, setGrossConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Текущий вес с физического индикатора (WebSocket). null/false — индикатор недоступен.
  const { weight, isConnected } = useScaleStore()

  const [showCreateSupplier, setShowCreateSupplier] = useState(false)
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const [showCreateMaterial, setShowCreateMaterial] = useState(false)
  const [showCreateDriver, setShowCreateDriver] = useState(false)
  const [showCreateTransport, setShowCreateTransport] = useState(false)
  const [showCreateCarrier, setShowCreateCarrier] = useState(false)
  const [showCreateConstruction, setShowCreateConstruction] = useState(false)

  // Поставщик — все активные компании; Заказчик — только наши ТОО (OWN); Материал — только тип «Прочее».
  const loadSuppliers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCompanies({ isActive: true, search }).then((l) => l.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )
  const loadCustomers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCompanies({ isActive: true, function: 'OWN', search }).then((l) => l.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )
  const loadMaterials = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getMaterials({ isActive: true, filterType: 'OTHER', search }).then((l) => l.map((m) => ({ id: m.id, label: m.name }))),
    [],
  )
  const loadCarriers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getCarriers({ isActive: true, search }).then((l) => l.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )
  const loadDrivers = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getDrivers({ isActive: true, search }).then((l) => l.map((d) => ({ id: d.id, label: d.fullName }))),
    [],
  )
  const loadTransports = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getTransports({ isActive: true, search }).then((l) => l.map((t) => ({ id: t.id, label: t.plateNumber }))),
    [],
  )
  const loadConstructions = useCallback(
    (search: string): Promise<SearchableOption[]> =>
      getConstructions({ isActive: true, search }).then((l) => l.map((c) => ({ id: c.id, label: c.name }))),
    [],
  )

  // Нетто = брутто − тара; брутто ≤ тары физически невозможно.
  const grossInvalid = !!tare && !!gross && Number(gross) <= Number(tare)

  const handleCreate = async (formData: CreatePlumbLogDto) => {
    if (grossInvalid) {
      toast.error(`Брутто (${gross} кг) должно быть больше тары (${tare} кг)`)
      return
    }

    if (application && formData.volume != null) {
      const remaining = application.targetVolume - application.progress.shippedVolume;
      if (formData.volume > remaining + 0.001) {
        toast.error(`Превышение объема заявки. Доступно: ${remaining.toFixed(2)} м³, запрошено: ${formData.volume} м³.`);
        return;
      }
    }

    setIsSubmitting(true)
    try {
      const created = await createPlumbLog(formData)

      if (isConcrete) {
        if (tare) {
          await weighTare(created.id, Number(tare))
        }
        if (gross) {
          await weighGross(created.id, Number(gross))
        }
      } else {
        if (gross) {
          await weighGross(created.id, Number(gross))
        }
        if (tare) {
          await weighTare(created.id, Number(tare))
        }
      }

      queryClient.invalidateQueries({ queryKey: plumbLogKeys.lists() })
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) })
      }

      toast.success('Отвес создан')

      if (applicationId) {
        router.push('/plan/view/' + applicationId)
      } else {
        router.push('/plumb/view/' + created.id)
      }
    } catch {
      toast.error('Ошибка при создании отвеса')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>
        <h1 className="text-2xl font-semibold text-foreground">
          {isConcrete ? 'Новый отвес бетона' : 'Новый отвес сырья'}
        </h1>
        {application && (
          <>
            <p className="mt-1 text-muted-foreground text-sm">
              Заявка #{application.id} · {application.material?.name}
            </p>
            <div className="mt-3">
              <ApplicationProgressBar
                shipped={application.progress.shippedVolume}
                loading={application.progress.loadingVolume}
                total={application.targetVolume}
                showText
                size="sm"
              />
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit(handleCreate)}>
        <div className="rounded-lg border border-border bg-card p-6 space-y-8">

          {/* Секция: Общие данные */}
          <div>
            <SectionTitle>Общие данные</SectionTitle>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {isConcrete ? (
                <>
                  <ReadonlyField label="Поставщик" value={application?.supplier?.name ?? ''} />
                  <ReadonlyField label="Заказчик" value={application?.customer?.name ?? ''} />
                  <ReadonlyField label="Объект" value={application?.object?.name ?? ''} />
                  <ReadonlyField label="Материал" value={application?.material?.name ?? ''} />
                </>
              ) : (
                <>
                  <Field label="Поставщик" required>
                    <Controller
                      name="supplierId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? 'empty'}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadSuppliers}
                          placeholder="Выберите поставщика"
                          onCreateNew={() => setShowCreateSupplier(true)}
                          createLabel="Добавить поставщика"
                        />
                      )}
                    />
                    {errors.supplierId && <p className="text-xs text-destructive">Обязательное поле</p>}
                  </Field>

                  <Field label="Заказчик" required>
                    <Controller
                      name="customerId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? 'empty'}
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
                  </Field>

                  <Field label="Материал" required>
                    <Controller
                      name="materialId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? 'empty'}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadMaterials}
                          placeholder="Выберите материал"
                          onCreateNew={() => setShowCreateMaterial(true)}
                          createLabel="Добавить материал"
                        />
                      )}
                    />
                    {errors.materialId && <p className="text-xs text-destructive">Обязательное поле</p>}
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* Секция: Транспорт */}
          <div>
            <SectionTitle>Транспорт</SectionTitle>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="Гос. номер" required>
                <Controller
                  name="transportId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <SearchableSelect
                      key={field.value ?? 'empty'}
                      value={field.value}
                      onChange={(id) => field.onChange(id)}
                      loadOptions={loadTransports}
                      placeholder="Выберите транспорт"
                      onCreateNew={() => setShowCreateTransport(true)}
                      createLabel="Добавить транспорт"
                    />
                  )}
                />
                {errors.transportId && <p className="text-xs text-destructive">Обязательное поле</p>}
              </Field>

              <Field label="Водитель">
                <Controller
                  name="driverId"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      key={field.value ?? 'empty'}
                      value={field.value}
                      onChange={(id) => field.onChange(id)}
                      loadOptions={loadDrivers}
                      placeholder="Выберите водителя"
                      onCreateNew={() => setShowCreateDriver(true)}
                      createLabel="Добавить водителя"
                    />
                  )}
                />
              </Field>

              <Field label="Перевозчик">
                <Controller
                  name="carrierId"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      key={field.value ?? 'empty'}
                      value={field.value}
                      onChange={(id) => field.onChange(id)}
                      loadOptions={loadCarriers}
                      placeholder="Выберите перевозчика"
                      onCreateNew={() => setShowCreateCarrier(true)}
                      createLabel="Добавить перевозчика"
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* Секция: Данные сырья / бетона */}
          <div>
            <SectionTitle>{isConcrete ? 'Данные бетона' : 'Данные сырья'}</SectionTitle>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {isConcrete ? (
                <>
                  <Field label="БСУ" required>
                    <Controller
                      name="bsuId"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Выберите БСУ" />
                          </SelectTrigger>
                          <SelectContent>
                            {bsuList.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.bsuId && <p className="text-xs text-destructive">Обязательное поле</p>}
                  </Field>

                  <Field label="Объём (м³)" required>
                    <Controller
                      name="volume"
                      control={control}
                      rules={{ required: true, min: 0.01 }}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0.00"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                    {errors.volume && <p className="text-xs text-destructive">Обязательное поле</p>}
                  </Field>

                  <Field label="Объём возврата (м³)">
                    <Controller
                      name="returnVolume"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0.00"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Номер пломбы">
                    <Controller
                      name="sealNumber"
                      control={control}
                      render={({ field }) => (
                        <Input
                          className="bg-background-elevated border-border h-9"
                          placeholder="СП-2024-001234"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Осадка конуса (см)">
                    <Controller
                      name="slumpCone"
                      control={control}
                      rules={{ validate: (v) => isValidSlumpCone(v) || 'Число «22» или диапазон «22-23»' }}
                      render={({ field }) => (
                        <Input
                          className="bg-background-elevated border-border h-9"
                          placeholder="напр. 22 или 22-23"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)}
                        />
                      )}
                    />
                    {errors.slumpCone && <p className="text-xs text-destructive">{errors.slumpCone.message}</p>}
                  </Field>

                  <Field label="Тип перевозки">
                    <Controller
                      name="deliveryType"
                      control={control}
                      render={({ field }) => (
                        <Input
                          className="bg-background-elevated border-border h-9"
                          placeholder="Тип перевозки"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || undefined)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Конструкция">
                    <Controller
                      name="constructionId"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          key={field.value ?? 'empty'}
                          value={field.value}
                          onChange={(id) => field.onChange(id)}
                          loadOptions={loadConstructions}
                          placeholder="Не выбрана"
                          onCreateNew={() => setShowCreateConstruction(true)}
                          createLabel="Добавить конструкцию"
                        />
                      )}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Номенклатура">
                    <Controller
                      name="nomenclatureId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Не выбрана" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {nomenclatures.map((n) => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  <Field label="Сорность (%)">
                    <Controller
                      name="impurity"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0.00"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Чистый нетто (кг)">
                    <Controller
                      name="cleanNet"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Field>

                  <Field label="Вес по документам (кг)">
                    <Controller
                      name="documentWeight"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* Секция: Данные по весу */}
          <div>
            <SectionTitle>Данные по весу</SectionTitle>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {/* Тара */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Тара (кг)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    className="bg-background-elevated border-border h-9 flex-1"
                    placeholder="Введите тару"
                    value={tare}
                    onChange={(e) => {
                      setTare(e.target.value)
                      setTareConfirmed(false)
                      if (!e.target.value && isConcrete) setGross('')
                    }}
                    disabled={!isConcrete ? !gross : false}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 shrink-0"
                    disabled={!isConnected || weight === null}
                    onClick={() => {
                      if (weight === null) return
                      setTare(String(weight))
                      setTareConfirmed(true)
                    }}
                  >
                    {tareConfirmed ? '✓ Тара' : 'Взвесить тару'}
                  </Button>
                </div>
              </div>

              {/* Брутто */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Брутто (кг)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    className="bg-background-elevated border-border h-9 flex-1"
                    placeholder="Введите брутто"
                    value={gross}
                    onChange={(e) => {
                      setGross(e.target.value)
                      setGrossConfirmed(false)
                      if (!e.target.value && !isConcrete) setTare('')
                    }}
                    disabled={isConcrete ? !tare : false}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 shrink-0"
                    disabled={!isConnected || weight === null}
                    onClick={() => {
                      if (weight === null) return
                      setGross(String(weight))
                      setGrossConfirmed(true)
                    }}
                  >
                    {grossConfirmed ? '✓ Брутто' : 'Взвесить брутто'}
                  </Button>
                </div>
                {grossInvalid && (
                  <p className="text-xs text-destructive">
                    Брутто должно быть больше тары ({Number(tare).toLocaleString('ru-RU')} кг)
                  </p>
                )}
              </div>
            </div>

            {tare && gross && Number(tare) > 0 && Number(gross) > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Нетто:</span>
                <span className="font-mono font-medium text-foreground">
                  {(Number(gross) - Number(tare)).toLocaleString('ru-RU')} кг
                </span>
              </div>
            )}

            {isConnected ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Текущий вес: <span className="font-medium text-foreground">{weight} кг</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Нет соединения с весами</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Сохранение...' : 'Создать отвес'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </form>

      <CreateInlineDialog open={showCreateSupplier} onOpenChange={setShowCreateSupplier} title="Новый поставщик">
        <CreateCompanyForm
          defaultFunction="SUPPLIER"
          onCreated={(company) => { setValue('supplierId', company.id); setShowCreateSupplier(false) }}
          onCancel={() => setShowCreateSupplier(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateCustomer} onOpenChange={setShowCreateCustomer} title="Новый заказчик">
        <CreateCompanyForm
          defaultFunction="OWN"
          onCreated={(company) => { setValue('customerId', company.id); setShowCreateCustomer(false) }}
          onCancel={() => setShowCreateCustomer(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateMaterial} onOpenChange={setShowCreateMaterial} title="Новый материал">
        <CreateMaterialForm
          onCreated={(material) => { setValue('materialId', material.id); setShowCreateMaterial(false) }}
          onCancel={() => setShowCreateMaterial(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateDriver} onOpenChange={setShowCreateDriver} title="Новый водитель">
        <CreateDriverForm
          onCreated={(driver) => { setValue('driverId', driver.id); setShowCreateDriver(false) }}
          onCancel={() => setShowCreateDriver(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateTransport} onOpenChange={setShowCreateTransport} title="Новый транспорт">
        <CreateTransportForm
          onCreated={(transport, driverId, carrierId) => {
            // setValue('transportId') не находит свежесозданный транспорт в кэше списка —
            // автозаполнение через useEffect не сработает, поэтому проставляем явно
            setValue('transportId', transport.id)
            if (driverId) setValue('driverId', driverId)
            if (carrierId) setValue('carrierId', carrierId)
            setShowCreateTransport(false)
          }}
          onCancel={() => setShowCreateTransport(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateCarrier} onOpenChange={setShowCreateCarrier} title="Новый перевозчик">
        <CreateCarrierForm
          onCreated={(carrier) => { setValue('carrierId', carrier.id); setShowCreateCarrier(false) }}
          onCancel={() => setShowCreateCarrier(false)}
        />
      </CreateInlineDialog>

      <CreateInlineDialog open={showCreateConstruction} onOpenChange={setShowCreateConstruction} title="Новая конструкция">
        <CreateConstructionForm
          onCreated={(construction) => { setValue('constructionId', construction.id); setShowCreateConstruction(false) }}
          onCancel={() => setShowCreateConstruction(false)}
        />
      </CreateInlineDialog>
    </div>
  )
}
