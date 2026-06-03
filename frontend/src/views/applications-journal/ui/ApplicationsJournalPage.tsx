"use client"



import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronRight,
  Filter,
  Calendar as CalendarIcon
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

interface Application {
  id: string
  time: string
  customer: string
  site: string
  material: string
  targetVolume: number
  shipped: number
  inProgress: number
  remaining: number
  expanded?: boolean
  subRows?: {
    id: string
    time: string
    driver: string
    vehicle: string
    volume: number
    status: 'shipped' | 'in-progress' | 'planned'
  }[]
}

const mockApplications: Application[] = [
  {
    id: '1',
    time: '08:00',
    customer: 'ООО СтройИнвест',
    site: 'ЖК Солнечный',
    material: 'M-350',
    targetVolume: 120,
    shipped: 80,
    inProgress: 20,
    remaining: 20,
    subRows: [
      { id: '1-1', time: '08:15', driver: 'Иванов А.П.', vehicle: 'A123BC', volume: 8, status: 'shipped' },
      { id: '1-2', time: '08:45', driver: 'Петров С.И.', vehicle: 'B456DE', volume: 8, status: 'shipped' },
      { id: '1-3', time: '09:15', driver: 'Сидоров К.М.', vehicle: 'C789FG', volume: 8, status: 'in-progress' },
    ]
  },
  {
    id: '2',
    time: '09:30',
    customer: 'АО МегаСтрой',
    site: 'БЦ Центральный',
    material: 'M-400',
    targetVolume: 80,
    shipped: 40,
    inProgress: 8,
    remaining: 32,
    subRows: [
      { id: '2-1', time: '09:45', driver: 'Козлов В.А.', vehicle: 'D012HI', volume: 8, status: 'shipped' },
      { id: '2-2', time: '10:15', driver: 'Новиков Р.Е.', vehicle: 'E345JK', volume: 8, status: 'in-progress' },
    ]
  },
  {
    id: '3',
    time: '10:00',
    customer: 'ИП Михайлов',
    site: 'Частный дом',
    material: 'M-250',
    targetVolume: 24,
    shipped: 0,
    inProgress: 0,
    remaining: 24,
    subRows: []
  },
  {
    id: '4',
    time: '11:00',
    customer: 'ООО ПромСтрой',
    site: 'Склад №5',
    material: 'M-350',
    targetVolume: 200,
    shipped: 160,
    inProgress: 24,
    remaining: 16,
    subRows: [
      { id: '4-1', time: '11:15', driver: 'Федоров Н.К.', vehicle: 'F678LM', volume: 8, status: 'shipped' },
      { id: '4-2', time: '11:45', driver: 'Григорьев О.С.', vehicle: 'G901NO', volume: 8, status: 'shipped' },
      { id: '4-3', time: '12:15', driver: 'Морозов П.Д.', vehicle: 'H234PQ', volume: 8, status: 'in-progress' },
    ]
  },
  {
    id: '5',
    time: '13:00',
    customer: 'ЗАО Бетонные технологии',
    site: 'Мост через реку Волга',
    material: 'M-500',
    targetVolume: 300,
    shipped: 240,
    inProgress: 16,
    remaining: 44,
    subRows: []
  },
]

function ProgressBar({ shipped, inProgress, remaining, total }: { shipped: number; inProgress: number; remaining: number; total: number }) {
  const shippedPercent = (shipped / total) * 100
  const inProgressPercent = (inProgress / total) * 100
  const remainingPercent = (remaining / total) * 100

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {shippedPercent > 0 && (
        <div 
          className="h-full bg-success transition-all" 
          style={{ width: `${shippedPercent}%` }}
        />
      )}
      {inProgressPercent > 0 && (
        <div 
          className="h-full bg-warning transition-all" 
          style={{ width: `${inProgressPercent}%` }}
        />
      )}
      {remainingPercent > 0 && (
        <div 
          className="h-full bg-muted-foreground/30 transition-all" 
          style={{ width: `${remainingPercent}%` }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'shipped' | 'in-progress' | 'planned' }) {
  const config = {
    'shipped': { label: 'Отгружено', className: 'bg-success/20 text-success' },
    'in-progress': { label: 'В пути', className: 'bg-warning/20 text-warning' },
    'planned': { label: 'План', className: 'bg-muted-foreground/20 text-muted-foreground' },
  }
  const { label, className } = config[status]
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export function ApplicationsJournalPage() {
  const [applications, setApplications] = useState(mockApplications)
  const [selectedDate] = useState(new Date())

  const toggleExpand = (id: string) => {
    setApplications(apps => 
      apps.map(app => 
        app.id === id ? { ...app, expanded: !app.expanded } : app
      )
    )
  }

  const totalShipped = applications.reduce((sum, app) => sum + app.shipped, 0)
  const totalInProgress = applications.reduce((sum, app) => sum + app.inProgress, 0)
  const totalPlanned = applications.reduce((sum, app) => sum + app.targetVolume, 0)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Журнал заявок</h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span className="capitalize">{formatDate(selectedDate)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Фильтры:</span>
        </div>
        
        <Select>
          <SelectTrigger className="w-[180px] bg-background-elevated border-border">
            <SelectValue placeholder="Материал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все материалы</SelectItem>
            <SelectItem value="m250">M-250</SelectItem>
            <SelectItem value="m350">M-350</SelectItem>
            <SelectItem value="m400">M-400</SelectItem>
            <SelectItem value="m500">M-500</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[180px] bg-background-elevated border-border">
            <SelectValue placeholder="Объект" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            <SelectItem value="jk">ЖК Солнечный</SelectItem>
            <SelectItem value="bc">БЦ Центральный</SelectItem>
            <SelectItem value="warehouse">Склад №5</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-[180px] bg-background-elevated border-border">
            <SelectValue placeholder="Транспорт" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Весь транспорт</SelectItem>
            <SelectItem value="available">Доступен</SelectItem>
            <SelectItem value="on-route">В рейсе</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-success/10 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-success" />
          <div>
            <p className="text-sm text-muted-foreground">Отгружено</p>
            <p className="text-xl font-semibold text-foreground">{totalShipped} <span className="text-sm font-normal text-muted-foreground">м³</span></p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-lg bg-warning/10 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-warning" />
          <div>
            <p className="text-sm text-muted-foreground">В процессе</p>
            <p className="text-xl font-semibold text-foreground">{totalInProgress} <span className="text-sm font-normal text-muted-foreground">м³</span></p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-muted-foreground/50" />
          <div>
            <p className="text-sm text-muted-foreground">План</p>
            <p className="text-xl font-semibold text-foreground">{totalPlanned} <span className="text-sm font-normal text-muted-foreground">м³</span></p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Время</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Заказчик</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объект</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Марка</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Объём</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground min-w-[200px]">Прогресс</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <>
                  <tr 
                    key={app.id}
                    className={`border-b border-border transition-colors hover:bg-background-elevated cursor-pointer ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => toggleExpand(app.id)}
                  >
                    <td className="px-4 py-3">
                      <button className="text-muted-foreground hover:text-foreground">
                        {app.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{app.time}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{app.customer}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{app.site}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {app.material}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{app.targetVolume} м³</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProgressBar 
                          shipped={app.shipped} 
                          inProgress={app.inProgress} 
                          remaining={app.remaining}
                          total={app.targetVolume}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {app.shipped}/{app.targetVolume}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {app.expanded && app.subRows && app.subRows.length > 0 && (
                    app.subRows.map((subRow) => (
                      <tr 
                        key={subRow.id}
                        className="border-b border-border bg-background-elevated/50"
                      >
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{subRow.time}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground" colSpan={2}>
                          {subRow.driver} • {subRow.vehicle}
                        </td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{subRow.volume} м³</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={subRow.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
