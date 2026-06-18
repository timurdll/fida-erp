import { Suspense } from 'react'
import { ApplicationsPlanPage } from '@/views/applications-plan'

export default function Page() {
  return (
    <Suspense>
      <ApplicationsPlanPage />
    </Suspense>
  )
}
