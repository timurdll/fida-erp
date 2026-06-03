'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { getDrivers } from '@/entities/driver/api/driverApi'
import { getCarriers } from '@/entities/carrier/api/carrierApi'
import type { Transport, CreateTransportDto } from '@/entities/transport/model/types'

interface TransportFormProps {
  defaultValues?: Transport
  onSubmit: (data: CreateTransportDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function TransportForm({ defaultValues, onSubmit, formRef }: TransportFormProps) {
  const { register, handleSubmit, control, reset, setValue } = useForm<CreateTransportDto>({
    defaultValues: defaultValues
      ? { plateNumber: defaultValues.plateNumber, driverId: defaultValues.driver?.id, carrierId: defaultValues.carrier?.id, tare: defaultValues.tare, tolerance: defaultValues.tolerance, note: defaultValues.note ?? '' }
      : { plateNumber: '', tolerance: 0, note: '' },
  })

  useEffect(() => {
    reset(defaultValues
      ? { plateNumber: defaultValues.plateNumber, driverId: defaultValues.driver?.id, carrierId: defaultValues.carrier?.id, tare: defaultValues.tare, tolerance: defaultValues.tolerance, note: defaultValues.note ?? '' }
      : { plateNumber: '', tolerance: 0, note: '' })
  }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Гос. номер *</Label>
        <Input
          className="bg-background-elevated border-border uppercase"
          placeholder="A 000 AA 00"
          {...register('plateNumber', { required: true })}
          onChange={(e) => setValue('plateNumber', e.target.value.toUpperCase())}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Водитель</Label>
        <Controller
          name="driverId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={(id) => field.onChange(id)}
              loadOptions={async (search) => {
                const data = await getDrivers({ isActive: true, search })
                return data.map((d) => ({ id: d.id, label: d.fullName }))
              }}
              placeholder="Выберите водителя"
            />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Перевозчик</Label>
        <Controller
          name="carrierId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={(id) => field.onChange(id)}
              loadOptions={async (search) => {
                const data = await getCarriers({ isActive: true, search })
                return data.map((c) => ({ id: c.id, label: c.name }))
              }}
              placeholder="Выберите перевозчика"
            />
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Тара (кг)</Label>
          <Input type="number" min="0" className="bg-background-elevated border-border" placeholder="0" {...register('tare', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Допуск (%)</Label>
          <Input type="number" step="0.1" min="0" className="bg-background-elevated border-border" placeholder="0.0" {...register('tolerance', { valueAsNumber: true })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Примечание</Label>
        <Textarea className="bg-background-elevated border-border resize-none" rows={2} placeholder="Дополнительная информация..." {...register('note')} />
      </div>
    </form>
  )
}
