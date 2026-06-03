'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import type { Construction, CreateConstructionDto } from '@/entities/construction/model/types'

interface ConstructionFormProps {
  defaultValues?: Construction
  onSubmit: (data: CreateConstructionDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function ConstructionForm({ defaultValues, onSubmit, formRef }: ConstructionFormProps) {
  const { register, handleSubmit, reset } = useForm<CreateConstructionDto>({
    defaultValues: defaultValues ? { name: defaultValues.name, type: defaultValues.type ?? '', note: defaultValues.note ?? '' } : { name: '', type: '', note: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, type: defaultValues.type ?? '', note: defaultValues.note ?? '' } : { name: '', type: '', note: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название конструкции" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Тип</Label>
        <Input className="bg-background-elevated border-border" placeholder="Тип конструкции" {...register('type')} />
      </div>
      <div className="space-y-1.5">
        <Label>Примечание</Label>
        <Textarea className="bg-background-elevated border-border resize-none" rows={3} placeholder="Дополнительная информация..." {...register('note')} />
      </div>
    </form>
  )
}
