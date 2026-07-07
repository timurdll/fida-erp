'use client'

import { Clock } from 'lucide-react'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { DatePickerButton } from '@/shared/ui/date-picker-button'
import { toLocalDateString } from '@/shared/utils/date'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function isoToParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  return {
    date: toLocalDateString(d),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

function mergeIsoDateTime(
  currentIso: string | null | undefined,
  date: string,
  time: string,
): string | null {
  if (!date || !time) return null
  const [y, m, day] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const seconds = currentIso ? new Date(currentIso).getSeconds() : 0
  return new Date(y, m - 1, day, hh, mm, seconds, 0).toISOString()
}

interface DateTimePickerFieldProps {
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  disabled = false,
}: DateTimePickerFieldProps) {
  const { date, time } = isoToParts(value)
  const [hh, mm] = time ? time.split(':') : ['', '']

  const handleDateChange = (nextDate: string) => {
    onChange(mergeIsoDateTime(value, nextDate, time || '00:00'))
  }

  const handleTimeChange = (nextHh: string, nextMm: string) => {
    onChange(
      mergeIsoDateTime(value, date || toLocalDateString(new Date()), `${nextHh}:${nextMm}`),
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex flex-col gap-2">
        <DatePickerButton
          value={date}
          onChange={handleDateChange}
          className="w-full"
          disabled={disabled}
        />
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Select
            value={hh}
            disabled={disabled || !date}
            onValueChange={(v) => handleTimeChange(v, mm || '00')}
          >
            <SelectTrigger className="h-9 w-24 bg-background-elevated border-border">
              <SelectValue placeholder="Час" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-medium text-muted-foreground">:</span>
          <Select
            value={mm}
            disabled={disabled || !date}
            onValueChange={(v) => handleTimeChange(hh || '00', v)}
          >
            <SelectTrigger className="h-9 w-24 bg-background-elevated border-border">
              <SelectValue placeholder="Мин" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
