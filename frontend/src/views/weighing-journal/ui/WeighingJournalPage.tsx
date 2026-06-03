'use client'

import Link from 'next/link'
import { Scale, Search, Plus, Filter } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const mockWeighings = [
  { id: '12847', time: '08:15', customer: 'ООО СтройИнвест', driver: 'Иванов А.П.', plate: 'A123BC', material: 'M-350', volume: 8, status: 'completed' },
  { id: '12846', time: '07:42', customer: 'АО МегаСтрой', driver: 'Петров С.И.', plate: 'B456DE', material: 'M-400', volume: 8, status: 'completed' },
  { id: '12845', time: '07:15', customer: 'ООО СтройИнвест', driver: 'Сидоров К.М.', plate: 'C789FG', material: 'M-350', volume: 8, status: 'completed' },
  { id: '12844', time: '06:30', customer: 'ИП Михайлов', driver: 'Козлов В.А.', plate: 'D012HI', material: 'M-250', volume: 6, status: 'pending' },
  { id: '12843', time: '06:00', customer: 'ЗАО Бетонные технологии', driver: 'Новиков Р.Е.', plate: 'E345JK', material: 'M-500', volume: 8, status: 'completed' },
]

function StatusBadge({ status }: { status: 'completed' | 'pending' }) {
  return status === 'completed' ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Завершен
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      В процессе
    </span>
  )
}

export function WeighingJournalPage() {
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Журнал отвесов</h1>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Новый отвес
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Поиск по номеру, водителю..."
            className="pl-9 bg-background-elevated border-border h-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px] bg-background-elevated border-border">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="completed">Завершен</SelectItem>
            <SelectItem value="pending">В процессе</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="today">
          <SelectTrigger className="w-[160px] bg-background-elevated border-border">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="week">За неделю</SelectItem>
            <SelectItem value="month">За месяц</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">№</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Время</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Заказчик</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Водитель</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Гос. номер</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Материал</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объём</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Статус</th>
            </tr>
          </thead>
          <tbody>
            {mockWeighings.map((weighing, index) => (
              <tr 
                key={weighing.id}
                className={`border-b border-border transition-colors hover:bg-background-elevated ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
              >
                <td className="px-4 py-3">
                  <Link href={`/weighing/${weighing.id}`} className="text-sm font-medium text-primary hover:underline">
                    #{weighing.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{weighing.time}</td>
                <td className="px-4 py-3 text-sm text-foreground">{weighing.customer}</td>
                <td className="px-4 py-3 text-sm text-foreground">{weighing.driver}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{weighing.plate}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {weighing.material}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{weighing.volume} м³</td>
                <td className="px-4 py-3">
                  <StatusBadge status={weighing.status as 'completed' | 'pending'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
