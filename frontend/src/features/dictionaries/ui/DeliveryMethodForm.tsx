'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { DeliveryMethod, CreateDeliveryMethodDto } from '@/entities/delivery-method/model/types'

interface DeliveryMethodFormProps {
  defaultValues?: DeliveryMethod
  onSubmit: (data: CreateDeliveryMethodDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function DeliveryMethodForm({ defaultValues, onSubmit, formRef }: DeliveryMethodFormProps) {
  const { register, handleSubmit, reset } = useForm<CreateDeliveryMethodDto>({
    defaultValues: defaultValues ? { name: defaultValues.name, type: defaultValues.type ?? '', note: defaultValues.note ?? '' } : { name: '', type: '', note: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, type: defaultValues.type ?? '', note: defaultValues.note ?? '' } : { name: '', type: '', note: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Способ приёмки" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Тип</Label>
        <Input className="bg-background-elevated border-border" placeholder="Тип" {...register('type')} />
      </div>
      <div className="space-y-1.5">
        <Label>Примечание</Label>
        <Textarea className="bg-background-elevated border-border resize-none" rows={3} placeholder="Дополнительная информация..." {...register('note')} />
      </div>
    </form>
  )
}
