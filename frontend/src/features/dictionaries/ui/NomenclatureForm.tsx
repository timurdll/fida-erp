'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import type { Nomenclature, CreateNomenclatureDto } from '@/entities/nomenclature/model/types'

interface NomenclatureFormProps {
  defaultValues?: Nomenclature
  onSubmit: (data: CreateNomenclatureDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function NomenclatureForm({ defaultValues, onSubmit, formRef }: NomenclatureFormProps) {
  const { register, handleSubmit, reset } = useForm<CreateNomenclatureDto>({
    defaultValues: defaultValues ? { name: defaultValues.name } : { name: '' },
  })

  useEffect(() => {
    reset(defaultValues ? { name: defaultValues.name } : { name: '' })
  }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название номенклатуры" {...register('name', { required: true })} />
      </div>
    </form>
  )
}
