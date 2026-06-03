'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { getCompanies } from '@/entities/company/api/companyApi'
import type { ObjectItem, CreateObjectDto } from '@/entities/object/model/types'

interface ObjectFormProps {
  defaultValues?: ObjectItem
  onSubmit: (data: CreateObjectDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function ObjectForm({ defaultValues, onSubmit, formRef }: ObjectFormProps) {
  const { register, handleSubmit, control, reset } = useForm<CreateObjectDto>({
    defaultValues: defaultValues
      ? { name: defaultValues.name, companyId: defaultValues.companyId, address: defaultValues.address ?? '', receiverPhone: defaultValues.receiverPhone ?? '' }
      : { name: '', address: '', receiverPhone: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, companyId: defaultValues.companyId, address: defaultValues.address ?? '', receiverPhone: defaultValues.receiverPhone ?? '' } : { name: '', address: '', receiverPhone: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название объекта" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Компания *</Label>
        <Controller
          name="companyId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <SearchableSelect
              value={field.value}
              onChange={(id) => field.onChange(id)}
              loadOptions={async (search) => {
                const data = await getCompanies({ isActive: true, search })
                return data.map((c) => ({ id: c.id, label: c.name }))
              }}
              placeholder="Выберите компанию"
            />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Адрес</Label>
        <Input className="bg-background-elevated border-border" placeholder="Адрес объекта" {...register('address')} />
      </div>
      <div className="space-y-1.5">
        <Label>Телефон получателя</Label>
        <Input className="bg-background-elevated border-border" placeholder="+7 (700) 000-00-00" {...register('receiverPhone')} />
      </div>
    </form>
  )
}
