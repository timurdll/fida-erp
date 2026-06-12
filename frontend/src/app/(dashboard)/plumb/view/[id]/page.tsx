'use client'

import { useParams } from 'next/navigation'
import { PlumbLogView } from '@/views/weighing-journal/ui/PlumbLogView'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <PlumbLogView id={Number(id)} />
}
