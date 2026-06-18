'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

interface DateTimePickerButtonProps {
  value: Date
  onChange: (d: Date) => void
  placeholder?: string
  className?: string
}

function formatDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hh}:${mm}`
}

export function DateTimePickerButton({
  value,
  onChange,
  className,
}: DateTimePickerButtonProps) {
  const minutes = value.getMinutes()
  const [minuteStr, setMinuteStr] = useState(() => String(minutes).padStart(2, '0'))

  // Синхронизация с внешним value (напр. «Сбросить») — корректировка стейта во время
  // рендера (рекомендованный React паттерн вместо setState в эффекте). Локальный ввод
  // не затирается: пока пользователь печатает, value.minutes не меняется → prev === minutes.
  const [prevMinutes, setPrevMinutes] = useState(minutes)
  if (minutes !== prevMinutes) {
    setPrevMinutes(minutes)
    setMinuteStr(String(minutes).padStart(2, '0'))
  }

  function selectDate(d: Date) {
    const next = new Date(d)
    next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    onChange(next)
  }

  function selectHour(hh: string) {
    const next = new Date(value)
    next.setHours(Number(hh))
    onChange(next)
  }

  function commitMinute(raw: string) {
    const n = Math.min(59, Math.max(0, Number(raw) || 0))
    const padded = String(n).padStart(2, '0')
    setMinuteStr(padded)
    const next = new Date(value)
    next.setMinutes(n, 0, 0)
    onChange(next)
  }

  const hh = String(value.getHours()).padStart(2, '0')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 justify-start text-left font-normal bg-background-elevated border-border',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="text-sm">{formatDisplay(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => d && selectDate(d)}
        />
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Select value={hh} onValueChange={selectHour}>
              <SelectTrigger className="w-20 h-8 bg-background-elevated border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground font-medium">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minuteStr}
              onChange={(e) => setMinuteStr(e.target.value)}
              onBlur={(e) => commitMinute(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitMinute(minuteStr)}
              className="w-16 h-8 text-sm bg-background-elevated border-border text-center"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
