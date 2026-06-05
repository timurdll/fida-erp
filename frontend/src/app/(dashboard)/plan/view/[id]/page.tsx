'use client'
import { useParams } from 'next/navigation'
import { PlanApplicationView } from '@/views/applications-plan/ui/PlanApplicationView'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <PlanApplicationView id={Number(id)} />
}
