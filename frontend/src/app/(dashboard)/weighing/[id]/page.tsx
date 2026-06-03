import { WeighingRecordPage } from '@/views/weighing-record'

export default function Page({ params }: { params: { id: string } }) {
  return <WeighingRecordPage id={params.id} />
}
