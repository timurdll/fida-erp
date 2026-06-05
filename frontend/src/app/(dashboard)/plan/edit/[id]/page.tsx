'use client'
import { useParams } from 'next/navigation'
import { PlanApplicationFormView } from '@/views/applications-plan/ui/PlanApplicationFormView'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <PlanApplicationFormView editId={Number(id)} />
}
