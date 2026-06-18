'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PlumbLogView } from '@/views/weighing-journal/ui/PlumbLogView'

function PlumbLogViewPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  return (
    <PlumbLogView
      id={Number(id)}
      backUrl={searchParams.get('backUrl') ?? undefined}
      backLabel={searchParams.get('backLabel') ?? undefined}
    />
  )
}

export default function Page() {
  return (
    <Suspense>
      <PlumbLogViewPage />
    </Suspense>
  )
}
