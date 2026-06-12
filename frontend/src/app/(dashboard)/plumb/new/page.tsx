'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlumbLogFormView } from '@/views/weighing-journal/ui/PlumbLogFormView'

function NewPlumbLogPage() {
  const params = useSearchParams()
  const applicationId = params.get('applicationId')
  return <PlumbLogFormView applicationId={applicationId ? Number(applicationId) : undefined} />
}

export default function Page() {
  return (
    <Suspense>
      <NewPlumbLogPage />
    </Suspense>
  )
}
