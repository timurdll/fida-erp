'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { getCompanies } from '@/entities/company/api/companyApi'
import type { Bsu, CreateBsuDto } from '@/entities/bsu/model/types'

interface BsuFormProps {
  defaultValues?: Bsu
  onSubmit: (data: CreateBsuDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function BsuForm({ defaultValues, onSubmit, formRef }: BsuFormProps) {
  const { register, handleSubmit, control, reset } = useForm<CreateBsuDto>({
    defaultValues: defaultValues
      ? { name: defaultValues.name, companyId: defaultValues.companyId, address: defaultValues.address ?? '' }
      : { name: '', address: '' },
  })

  useEffect(() => {
    reset(defaultValues
      ? { name: defaultValues.name, companyId: defaultValues.companyId, address: defaultValues.address ?? '' }
      : { name: '', address: '' })
  }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-own', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true, function: 'OWN' }),
    staleTime: 60_000,
  })

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название БСУ" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Компания *</Label>
        <Controller
          name="companyId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger className="w-full bg-background-elevated border-border">
                <SelectValue placeholder="Выберите компанию" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Адрес</Label>
        <Input className="bg-background-elevated border-border" placeholder="Адрес БСУ" {...register('address')} />
      </div>
    </form>
  )
}
