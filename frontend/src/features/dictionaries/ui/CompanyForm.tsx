'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import type { Company, CreateCompanyDto } from '@/entities/company/model/types'
import { CompanyFunctionLabel, CompanyTypeLabel } from '@/entities/company/model/types'

interface CompanyFormProps {
  defaultValues?: Company
  onSubmit: (data: CreateCompanyDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function CompanyForm({ defaultValues, onSubmit, formRef }: CompanyFormProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<CreateCompanyDto>({
    defaultValues: defaultValues
      ? { name: defaultValues.name, function: defaultValues.function, type: defaultValues.type, bin: defaultValues.bin ?? '', contactPhone: defaultValues.contactPhone ?? '' }
      : { name: '', bin: '', contactPhone: '' },
  })

  useEffect(() => { reset(defaultValues ? { name: defaultValues.name, function: defaultValues.function, type: defaultValues.type, bin: defaultValues.bin ?? '', contactPhone: defaultValues.contactPhone ?? '' } : { name: '', bin: '', contactPhone: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const fn = watch('function')
  const tp = watch('type')

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Название компании" {...register('name', { required: true })} />
      </div>
      <div className="space-y-1.5">
        <Label>Функция *</Label>
        <Select value={fn} onValueChange={(v) => setValue('function', v as any)}>
          <SelectTrigger className="bg-background-elevated border-border"><SelectValue placeholder="Выберите функцию" /></SelectTrigger>
          <SelectContent>
            {Object.entries(CompanyFunctionLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Тип *</Label>
        <Select value={tp} onValueChange={(v) => setValue('type', v as any)}>
          <SelectTrigger className="bg-background-elevated border-border"><SelectValue placeholder="Выберите тип" /></SelectTrigger>
          <SelectContent>
            {Object.entries(CompanyTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>БИН</Label>
        <Input className="bg-background-elevated border-border" placeholder="БИН организации" {...register('bin')} />
      </div>
      <div className="space-y-1.5">
        <Label>Контактный телефон</Label>
        <Input className="bg-background-elevated border-border" placeholder="+7 (700) 000-00-00" {...register('contactPhone')} />
      </div>
    </form>
  )
}
