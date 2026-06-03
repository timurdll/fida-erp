'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import type { Material, CreateMaterialDto } from '@/entities/material/model/types'
import { MaterialTypeLabel } from '@/entities/material/model/types'

interface MaterialFormProps {
  defaultValues?: Material
  onSubmit: (data: CreateMaterialDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function MaterialForm({ defaultValues, onSubmit, formRef }: MaterialFormProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<CreateMaterialDto>({
    defaultValues: defaultValues
      ? { name: defaultValues.name, type: defaultValues.type, density: defaultValues.density }
      : { name: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, type: defaultValues.type, density: defaultValues.density } : { name: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const tp = watch('type')

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название материала" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Тип *</Label>
        <Select value={tp} onValueChange={(v) => setValue('type', v as any)}>
          <SelectTrigger className="bg-background-elevated border-border"><SelectValue placeholder="Выберите тип" /></SelectTrigger>
          <SelectContent>
            {Object.entries(MaterialTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Плотность (т/м³)</Label>
        <Input type="number" step="0.01" min="0" className="bg-background-elevated border-border" placeholder="0.00" {...register('density', { valueAsNumber: true })} />
      </div>
    </form>
  )
}
