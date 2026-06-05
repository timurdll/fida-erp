'use client'

import { useSearchParams } from 'next/navigation'
import { PlanApplicationFormView } from '@/views/applications-plan/ui/PlanApplicationFormView'

export default function Page() {
  const params = useSearchParams()
  const date = params.get('date') ?? undefined
  const time = params.get('time') ?? undefined
  return <PlanApplicationFormView presetDate={date} presetTime={time} />
}
