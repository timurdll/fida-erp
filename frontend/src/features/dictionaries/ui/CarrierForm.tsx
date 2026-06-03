'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { Carrier, CreateCarrierDto } from '@/entities/carrier/model/types'

interface CarrierFormProps {
  defaultValues?: Carrier
  onSubmit: (data: CreateCarrierDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function CarrierForm({ defaultValues, onSubmit, formRef }: CarrierFormProps) {
  const { register, handleSubmit, reset } = useForm<CreateCarrierDto>({
    defaultValues: defaultValues ? { name: defaultValues.name, note: defaultValues.note ?? '' } : { name: '', note: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, note: defaultValues.note ?? '' } : { name: '', note: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название перевозчика" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Примечание</Label>
        <Textarea className="bg-background-elevated border-border resize-none" rows={3} placeholder="Дополнительная информация..." {...register('note')} />
      </div>
    </form>
  )
}
