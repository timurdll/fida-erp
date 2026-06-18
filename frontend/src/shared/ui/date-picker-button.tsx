'use client'

import { CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Calendar } from '@/shared/ui/calendar'
import { cn } from '@/shared/lib/utils'
import {
  toLocalDateString as toLocalDateStr,
  parseLocalDateString as parseDateStr,
} from '@/shared/utils/date'

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface DatePickerButtonProps {
  value: string            // YYYY-MM-DD or empty
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  clearable?: boolean
}

export function DatePickerButton({
  value,
  onChange,
  placeholder = 'Выберите дату',
  className,
  clearable = false,
}: DatePickerButtonProps) {
  const dateObj = value ? parseDateStr(value) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 justify-start text-left font-normal bg-background-elevated border-border',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="text-sm">{dateObj ? formatDisplayDate(dateObj) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={(d) => onChange(d ? toLocalDateStr(d) : '')}
        />
        {clearable && value && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground text-xs"
              onClick={() => onChange('')}
            >
              Очистить
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
