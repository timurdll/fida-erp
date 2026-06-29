'use client'

import * as React from 'react'
import { MoreHorizontal, Pencil, Power } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Skeleton } from '@/shared/ui/skeleton'
import { MobileCard } from '@/shared/ui/mobile-card'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />Активный
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />Неактивный
    </span>
  )
}

/**
 * Мобильное (< md) представление таблицы справочника карточками.
 * Един для всех 10 табов: тап по карточке открывает форму редактирования,
 * меню «...» — Редактировать / Деактивировать (или Активировать).
 * `onActivate` опционален — у БСУ и Номенклатуры нет активации.
 */
export function DictionaryMobileCards<T extends { id: number | string; isActive: boolean }>(props: {
  loading: boolean
  items: T[]
  pageItems: T[]
  getTitle: (item: T) => React.ReactNode
  getRows?: (item: T) => { label: string; value: React.ReactNode }[]
  onEdit: (item: T) => void
  onActivate?: (item: T) => void
  onDeactivate: (item: T) => void
}) {
  const { loading, items, pageItems, getTitle, getRows, onEdit, onActivate, onDeactivate } = props

  return (
    <div className="md:hidden">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Ничего не найдено
        </div>
      ) : (
        pageItems.map((item) => (
          <MobileCard
            key={item.id}
            onClick={() => onEdit(item)}
            title={getTitle(item)}
            badge={<StatusBadge isActive={item.isActive} />}
            rows={getRows?.(item)}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="mr-2 h-4 w-4" />Редактировать
                  </DropdownMenuItem>
                  {item.isActive ? (
                    <DropdownMenuItem onClick={() => onDeactivate(item)} className="text-destructive focus:text-destructive">
                      <Power className="mr-2 h-4 w-4" />Деактивировать
                    </DropdownMenuItem>
                  ) : (
                    onActivate && (
                      <DropdownMenuItem onClick={() => onActivate(item)}>
                        <Power className="mr-2 h-4 w-4" />Активировать
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        ))
      )}
    </div>
  )
}
