'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const days = ['Пн 3', 'Вт 4', 'Ср 5', 'Чт 6', 'Пт 7', 'Сб 8', 'Вс 9']

const plannedDeliveries = [
  { day: 0, time: '08:00', customer: 'ООО СтройИнвест', site: 'ЖК Солнечный', volume: 120, color: 'bg-primary/20 border-primary/40' },
  { day: 0, time: '10:00', customer: 'АО МегаСтрой', site: 'БЦ Центральный', volume: 80, color: 'bg-success/20 border-success/40' },
  { day: 1, time: '07:00', customer: 'ООО ПромСтрой', site: 'Склад №5', volume: 200, color: 'bg-warning/20 border-warning/40' },
  { day: 1, time: '13:00', customer: 'ИП Михайлов', site: 'Частный дом', volume: 24, color: 'bg-primary/20 border-primary/40' },
  { day: 2, time: '09:00', customer: 'ЗАО Бетонные технологии', site: 'Мост через реку Волга', volume: 300, color: 'bg-success/20 border-success/40' },
  { day: 3, time: '08:00', customer: 'ООО СтройИнвест', site: 'ЖК Солнечный', volume: 100, color: 'bg-primary/20 border-primary/40' },
  { day: 4, time: '11:00', customer: 'АО МегаСтрой', site: 'БЦ Центральный', volume: 60, color: 'bg-warning/20 border-warning/40' },
]

export function ApplicationsPlanPage() {
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">План заявок</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Select defaultValue="week">
            <SelectTrigger className="w-[140px] bg-background-elevated border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="bg-background-elevated border-border">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground px-2">3 — 9 июня 2026</span>
            <Button variant="outline" size="icon" className="bg-background-elevated border-border">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Создать заявку
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border">Время</div>
          {days.map((day, i) => (
            <div 
              key={day} 
              className={`p-3 text-sm font-medium text-center ${i === 0 ? 'text-primary bg-primary/5' : 'text-foreground'} ${i < days.length - 1 ? 'border-r border-border' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Time Rows */}
        {timeSlots.map((time, timeIndex) => (
          <div key={time} className={`grid grid-cols-8 ${timeIndex < timeSlots.length - 1 ? 'border-b border-border' : ''}`}>
            <div className="p-3 text-sm text-muted-foreground border-r border-border">{time}</div>
            {days.map((_, dayIndex) => {
              const delivery = plannedDeliveries.find(d => d.day === dayIndex && d.time === time)
              return (
                <div 
                  key={dayIndex} 
                  className={`p-2 min-h-[60px] ${dayIndex < days.length - 1 ? 'border-r border-border' : ''} ${dayIndex === 0 ? 'bg-primary/[0.02]' : ''}`}
                >
                  {delivery && (
                    <div className={`rounded-md border p-2 text-xs ${delivery.color} cursor-pointer hover:opacity-80 transition-opacity`}>
                      <p className="font-medium text-foreground truncate">{delivery.customer}</p>
                      <p className="text-muted-foreground truncate">{delivery.site}</p>
                      <p className="text-muted-foreground mt-1">{delivery.volume} м³</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
