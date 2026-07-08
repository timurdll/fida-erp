'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
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

export interface SearchableOption {
  id: number
  label: string
}

interface SearchableSelectProps {
  value?: number
  onChange: (id: number | undefined) => void
  loadOptions: (search: string) => Promise<SearchableOption[]>
  placeholder?: string
  disabled?: boolean
  /** Если задан — вверху списка появляется пункт сброса фильтра */
  clearLabel?: string
  /** Если задан — внизу списка появляется кнопка «+ Добавить новый» */
  onCreateNew?: () => void
  createLabel?: string
}

export function SearchableSelect({
  value,
  onChange,
  loadOptions,
  placeholder = 'Выберите...',
  disabled,
  clearLabel,
  onCreateNew,
  createLabel = 'Добавить новый',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<SearchableOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const data = await loadOptions(q)
        setOptions(data)
        if (value) {
          const found = data.find((o) => o.id === value)
          if (found) setSelectedLabel(found.label)
        }
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [loadOptions, value],
  )

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, search, load])

  // Load initial label when value changes from outside
  useEffect(() => {
    if (value && selectedLabel === '') {
      load('')
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between border-border bg-background-elevated text-sm font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? selectedLabel || `ID: ${value}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {/* Поиск выполняется на сервере через loadOptions — отключаем клиентскую фильтрацию cmdk
            (иначе она матчит ввод против value=id и прячет все строки) */}
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
                <CommandEmpty>Ничего не найдено</CommandEmpty>
                <CommandGroup>
                  {clearLabel && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange(undefined)
                        setSelectedLabel('')
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          !value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {clearLabel}
                    </CommandItem>
                  )}
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={String(opt.id)}
                      onSelect={() => {
                        onChange(opt.id === value ? undefined : opt.id)
                        setSelectedLabel(opt.label)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === opt.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {onCreateNew && (
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-primary cursor-pointer hover:bg-primary/5 border-t border-border mt-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      onCreateNew()
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    {createLabel}
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
