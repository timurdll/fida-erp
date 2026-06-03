'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import type { Driver, CreateDriverDto } from '@/entities/driver/model/types'

interface DriverFormProps {
  defaultValues?: Driver
  onSubmit: (data: CreateDriverDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function DriverForm({ defaultValues, onSubmit, formRef }: DriverFormProps) {
  const { register, handleSubmit, reset } = useForm<CreateDriverDto>({
    defaultValues: defaultValues ? { fullName: defaultValues.fullName } : { fullName: '' },
  })

  useEffect(() => { reset(defaultValues ? { fullName: defaultValues.fullName } : { fullName: '' }) }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>ФИО *</Label>
        <Input className="bg-background-elevated border-border" placeholder="Иванов Иван Иванович" {...register('fullName', { required: true })} />
      </div>
    </form>
  )
}
