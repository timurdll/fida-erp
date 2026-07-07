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

const MAX_VISIBLE_CHIPS = 3

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
  const [chipsExpanded, setChipsExpanded] = useState(false)
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

  // Подгружаем подписи для выбранных id, даже когда дропдаун закрыт
  useEffect(() => {
    if (value.length === 0) return
    const hasMissing = value.some((id) => !labels.has(id))
    if (hasMissing) load('')
  }, [value, labels, load])

  useEffect(() => {
    if (value.length <= MAX_VISIBLE_CHIPS) setChipsExpanded(false)
  }, [value.length])

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  function remove(id: number) {
    onChange(value.filter((v) => v !== id))
  }

  const hasSelection = value.length > 0
  const showAllChips = chipsExpanded || value.length <= MAX_VISIBLE_CHIPS
  const visibleIds = showAllChips ? value : value.slice(0, MAX_VISIBLE_CHIPS)
  const hiddenCount = value.length - visibleIds.length

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between border-border bg-background-elevated text-sm font-normal"
          >
            <span className={cn('truncate', !hasSelection && 'text-muted-foreground')}>
              {hasSelection ? `Выбрано: ${value.length}` : placeholder}
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
                  {hasSelection && (
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

      {hasSelection && (
        <div className="space-y-1">
          <div
            className={cn(
              'flex flex-wrap gap-1',
              chipsExpanded && value.length > MAX_VISIBLE_CHIPS && 'max-h-20 overflow-y-auto pr-0.5',
            )}
          >
            {visibleIds.map((id) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-border bg-background-elevated px-1.5 py-0.5 text-xs text-foreground"
              >
                <span className="truncate max-w-[140px]">
                  {labels.get(id) ?? `ID ${id}`}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label="Убрать"
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  onClick={() => remove(id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                disabled={disabled}
                className="inline-flex items-center rounded-md border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                onClick={() => setChipsExpanded(true)}
              >
                +{hiddenCount} ещё
              </button>
            )}
            {chipsExpanded && value.length > MAX_VISIBLE_CHIPS && (
              <button
                type="button"
                disabled={disabled}
                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={() => setChipsExpanded(false)}
              >
                Свернуть
              </button>
            )}
          </div>
          {value.length > 1 && (
            <button
              type="button"
              disabled={disabled}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              onClick={() => onChange([])}
            >
              Очистить все
            </button>
          )}
        </div>
      )}
    </div>
  )
}
