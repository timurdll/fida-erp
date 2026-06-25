'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/checkbox'
import { getCompanies } from '@/entities/company/api/companyApi'
import type { Bsu, CreateBsuDto } from '@/entities/bsu/model/types'

interface BsuFormFields {
  name: string
  address: string
}

interface BsuFormProps {
  defaultValues?: Bsu
  onSubmit: (data: CreateBsuDto) => void
  formRef: React.RefObject<HTMLFormElement | null>
}

export function BsuForm({ defaultValues, onSubmit, formRef }: BsuFormProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    defaultValues?.companies?.map((c) => c.id) ?? [],
  )


  const { register, handleSubmit, reset } = useForm<BsuFormFields>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      address: defaultValues?.address ?? '',
    },
  })

  useEffect(() => {
    reset({
      name: defaultValues?.name ?? '',
      address: defaultValues?.address ?? '',
    })
    setSelectedIds(defaultValues?.companies?.map((c) => c.id) ?? [])
  }, [defaultValues]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-own', { isActive: true }],
    queryFn: () => getCompanies({ isActive: true, function: 'OWN' }),
    staleTime: 60_000,
  })

  const toggleCompany = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const removeCompany = (id: number) => setSelectedIds((prev) => prev.filter((x) => x !== id))

  const handleFormSubmit = (fields: BsuFormFields) => {
    onSubmit({ ...fields, companyIds: selectedIds })
  }

  const selectedCompanies = companies.filter((c) => selectedIds.includes(c.id))

  return (
    <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Название *</Label>
        <Input
          className="bg-background-elevated border-border"
          placeholder="Название БСУ"
          {...register('name', { required: true })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Компании</Label>

        {/* Selected badges */}
        {selectedCompanies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedCompanies.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => removeCompany(c.id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Checkbox list */}
        <div className="rounded-md border border-border bg-background-elevated divide-y divide-border max-h-48 overflow-y-auto">
          {companies.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Нет доступных компаний</p>
          ) : (
            companies.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background text-sm"
              >
                <Checkbox
                  checked={selectedIds.includes(c.id)}
                  onCheckedChange={() => toggleCompany(c.id)}
                />
                <span className="text-foreground">{c.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Адрес</Label>
        <Input
          className="bg-background-elevated border-border"
          placeholder="Адрес БСУ"
          {...register('address')}
        />
      </div>
    </form>
  )
}
