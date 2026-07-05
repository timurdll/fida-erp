'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/shared/ui/skeleton'
import { applicationKeys } from '@/entities/application/model/queryKeys'
import {
  getApplicationById,
  createApplication,
  updateApplication,
} from '@/entities/application/api/applicationApi'
import type { CreateApplicationDto } from '@/entities/application/model/types'
import { ApplicationForm } from '@/features/applications/ui/ApplicationForm'

interface Props {
  editId?: number
  presetDate?: string  // YYYY-MM-DD from calendar cell click
  presetTime?: string  // HH:mm from calendar cell click
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatVolume(value: number) {
  return value.toFixed(2)
}

export function PlanApplicationFormView({ editId, presetDate, presetTime }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!editId

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: applicationKeys.detail(editId!),
    queryFn: () => getApplicationById(editId!),
    enabled: isEdit,
  })

  const createMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      toast.success('Заявка создана')
      router.push('/plan?date=' + data.deliveryDate.slice(0, 10))
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Ошибка при создании заявки')),
  })

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<CreateApplicationDto>) => updateApplication(editId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(editId!) })
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
      toast.success('Заявка обновлена')
      router.push('/plan/view/' + editId)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Ошибка при обновлении заявки')),
  })

  const handleSubmit = (data: CreateApplicationDto) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  const defaultValues: Partial<CreateApplicationDto> | undefined = existing
    ? {
        supplierId: existing.supplierId,
        customerId: existing.customerId,
        objectId: existing.objectId,
        materialId: existing.materialId,
        constructionId: existing.constructionId ?? undefined,
        deliveryMethodId: existing.deliveryMethodId ?? undefined,
        targetVolume: existing.targetVolume,
        deliveryDate: existing.deliveryDate.slice(0, 10),
        deliveryTime: existing.deliveryTime ?? '',
        loadingInterval: existing.loadingInterval ?? 30,
        slumpCone: existing.slumpCone ?? undefined,
        note: existing.note ?? undefined,
      }
    : {
        // Preset from calendar cell click (only for new applications)
        ...(presetDate ? { deliveryDate: presetDate } : {}),
        ...(presetTime ? { deliveryTime: presetTime } : {}),
      }

  const shippedVolume = existing?.progress.shippedVolume ?? 0
  const loadingVolume = existing?.progress.loadingVolume ?? 0
  const minTargetVolume = existing ? shippedVolume + loadingVolume : undefined
  const minTargetVolumeDescription =
    minTargetVolume && minTargetVolume > 0
      ? loadingVolume > 0
        ? `Минимум ${formatVolume(minTargetVolume)} м³: ${formatVolume(shippedVolume)} м³ отгружено, ${formatVolume(loadingVolume)} м³ на погрузке.`
        : `Минимум ${formatVolume(minTargetVolume)} м³: уже отгружено ${formatVolume(shippedVolume)} м³.`
      : undefined

  return (
    <div className="min-h-screen p-6">
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {isEdit ? `Редактировать заявку №${editId}` : 'Новая заявка'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isEdit
            ? 'Измените данные и сохраните изменения'
            : 'Введите данные заявки и добавьте её в план отгрузки'}
        </p>
      </div>

      {isEdit && existingLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ApplicationForm
          key={existing?.id ?? `new-${presetDate}-${presetTime}`}
          defaultValues={defaultValues}
          minTargetVolume={minTargetVolume}
          minTargetVolumeDescription={minTargetVolumeDescription}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
          submitLabel={isEdit ? 'Сохранить изменения' : 'Добавить в план отгрузки'}
          onCancel={() => router.back()}
        />
      )}
    </div>
  )
}
