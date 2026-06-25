'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlanApplicationFormView } from '@/views/applications-plan/ui/PlanApplicationFormView'

function AddApplicationPage() {
  const params = useSearchParams()
  const date = params.get('date') ?? undefined
  const time = params.get('time') ?? undefined
  return <PlanApplicationFormView presetDate={date} presetTime={time} />
}

export default function Page() {
  return (
    <Suspense>
      <AddApplicationPage />
    </Suspense>
  )
}
