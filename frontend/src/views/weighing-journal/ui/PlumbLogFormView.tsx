'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { plumbLogKeys } from '@/entities/plumb-log/model/queryKeys'
import { createPlumbLog, weighTare, weighGross } from '@/entities/plumb-log/api/plumbLogApi'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import { getApplicationById } from '@/entities/application/api/applicationApi'
import { ApplicationProgressBar } from '@/features/applications/ui/ApplicationProgressBar'
import { getCompanies } from '@/entities/company/api/companyApi'
import { getMaterials } from '@/entities/material/api/materialApi'
import { getTransports } from '@/entities/transport/api/transportApi'
import { getDrivers } from '@/entities/driver/api/driverApi'
import { getBsuList } from '@/entities/bsu/api/bsuApi'
import { getNomenclatures } from '@/entities/nomenclature/api/nomenclatureApi'
import { getConstructions } from '@/entities/construction/api/constructionApi'
import type { CreatePlumbLogDto } from '@/entities/plumb-log/model/types'

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

  const { data: suppliers = [] } = useQuery({
    queryKey: ['companies', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['companies-own', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true, function: 'OWN' }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials', { isActive: true }],
    queryFn: () => getMaterials({ isActive: true }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  const { data: transports = [] } = useQuery({
    queryKey: ['transports', { isActive: true }],
    queryFn: () => getTransports({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', { isActive: true }],
    queryFn: () => getDrivers({ isActive: true }),
    staleTime: 60_000,
  })

  const { data: bsuList = [] } = useQuery({
    queryKey: ['bsu', { isActive: true, companyId: supplierId }],
    queryFn: () => getBsuList({ isActive: true, companyId: supplierId }),
    enabled: isConcrete && !!supplierId,
    staleTime: 60_000,
  })

  const { data: nomenclatures = [] } = useQuery({
    queryKey: ['nomenclatures', { isActive: true }],
    queryFn: () => getNomenclatures({ isActive: true }),
    staleTime: 60_000,
    enabled: !isConcrete,
  })

  const { data: constructions = [] } = useQuery({
    queryKey: ['constructions', { isActive: true }],
    queryFn: () => getConstructions({ isActive: true }),
    staleTime: 60_000,
    enabled: isConcrete,
  })

  useEffect(() => {
    if (application) {
      setValue('supplierId', application.supplierId)
      setValue('customerId', application.customerId)
      setValue('materialId', application.materialId)
      setValue('objectId', application.objectId)
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

  const selectedTransport = transports.find((t) => t.id === transportId)

  const [tare, setTare] = useState('')
  const [gross, setGross] = useState('')
  const [tareConfirmed, setTareConfirmed] = useState(false)
  const [grossConfirmed, setGrossConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setTareConfirmed(false) }, [tare])
  useEffect(() => { setGrossConfirmed(false) }, [gross])

  const handleCreate = async (formData: CreatePlumbLogDto) => {
    setIsSubmitting(true)
    try {
      const created = await createPlumbLog(formData)

      if (tare) {
        await weighTare(created.id, Number(tare))
      }
      if (tare && gross) {
        await weighGross(created.id, Number(gross))
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
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
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Выберите поставщика" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Выберите заказчика" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Выберите материал" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Field label="Гос. номер" required>
                <Controller
                  name="transportId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                        <SelectValue placeholder="Выберите транспорт" />
                      </SelectTrigger>
                      <SelectContent>
                        {transports.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.plateNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.transportId && <p className="text-xs text-destructive">Обязательное поле</p>}
              </Field>

              <Field label="Водитель">
                <Controller
                  name="driverId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                      <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                        <SelectValue placeholder="Водитель" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не выбран</SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <ReadonlyField
                label="Перевозчик"
                value={selectedTransport?.carrier?.name ?? '—'}
              />
            </div>
          </div>

          {/* Секция: Данные сырья / бетона */}
          <div>
            <SectionTitle>{isConcrete ? 'Данные бетона' : 'Данные сырья'}</SectionTitle>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
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
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.1"
                          className="bg-background-elevated border-border h-9"
                          placeholder="0"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      )}
                    />
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
                        <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}>
                          <SelectTrigger className="w-full bg-background-elevated border-border h-9">
                            <SelectValue placeholder="Не выбрана" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрана</SelectItem>
                            {constructions.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
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
                      if (!e.target.value) setGross('')
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 shrink-0"
                    disabled={!tare || tareConfirmed}
                    onClick={() => setTareConfirmed(true)}
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
                    onChange={(e) => setGross(e.target.value)}
                    disabled={!tare}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 shrink-0"
                    disabled={!gross || !tare || grossConfirmed}
                    onClick={() => setGrossConfirmed(true)}
                  >
                    {grossConfirmed ? '✓ Брутто' : 'Взвесить брутто'}
                  </Button>
                </div>
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
    </div>
  )
}
