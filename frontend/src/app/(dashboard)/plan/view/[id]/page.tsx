'use client'
import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PlanApplicationView } from '@/views/applications-plan/ui/PlanApplicationView'

function PlanApplicationViewPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  return <PlanApplicationView id={Number(id)} backDate={searchParams.get('backDate') ?? undefined} />
}

export default function Page() {
  return (
    <Suspense>
      <PlanApplicationViewPage />
    </Suspense>
  )
}
