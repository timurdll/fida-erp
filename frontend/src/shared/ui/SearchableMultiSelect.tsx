'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { SearchableOption } from '@/shared/ui/SearchableSelect'

interface SearchableMultiSelectProps {
  value?: number[]
  onChange: (ids: number[]) => void
  loadOptions: (search: string) => Promise<SearchableOption[]>
  placeholder?: string
  disabled?: boolean
}

export function SearchableMultiSelect({
  value = [],
  onChange,
  loadOptions,
  placeholder = 'Выберите...',
  disabled,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<SearchableOption[]>([])
  const [loading, setLoading] = useState(false)
  const [labels, setLabels] = useState<Map<number, string>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const data = await loadOptions(q)
        setOptions(data)
        setLabels((prev) => {
          const next = new Map(prev)
          for (const opt of data) {
            next.set(opt.id, opt.label)
          }
          return next
        })
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [loadOptions],
  )

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, search, load])

  useEffect(() => {
    if (value.length > 0 && labels.size === 0) {
      load('')
    }
  }, [value, labels.size, load])

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  function triggerLabel(): string {
    if (value.length === 0) return placeholder
    if (value.length === 1) {
      const id = value[0]
      return labels.get(id) ?? `ID: ${id}`
    }
    return `Выбрано: ${value.length}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between border-border bg-background-elevated text-sm font-normal"
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
            {triggerLabel()}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Поиск..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {value.length > 0 && (
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      Выбрано: {value.length}
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onChange([])}
                    >
                      <X className="h-3 w-3" />
                      Сбросить
                    </button>
                  </div>
                )}
                <CommandEmpty>Ничего не найдено</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => {
                    const selected = value.includes(opt.id)
                    return (
                      <CommandItem
                        key={opt.id}
                        value={String(opt.id)}
                        onSelect={() => toggle(opt.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {opt.label}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
