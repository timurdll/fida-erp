'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

interface TablePaginationProps {
  page: number
  pageCount: number
  total: number
  /** Диапазон текущей страницы (из usePagination) */
  from: number
  to: number
  onPageChange: (page: number) => void
}

/** Номера страниц с многоточием: 1 … 3 4 5 … 42 (при <=7 страницах — все подряд). */
function buildPages(page: number, count: number): Array<number | 'ellipsis'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const items: Array<number | 'ellipsis'> = [1]
  const left = Math.max(2, page - 1)
  const right = Math.min(count - 1, page + 1)
  if (left > 2) items.push('ellipsis')
  for (let p = left; p <= right; p++) items.push(p)
  if (right < count - 1) items.push('ellipsis')
  items.push(count)
  return items
}

/** Футер пагинации под таблицей. Скрывается, если всего одна страница. */
export function TablePagination({ page, pageCount, total, from, to, onPageChange }: TablePaginationProps) {
  if (pageCount <= 1) return null
  const pages = buildPages(page, pageCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Показано <span className="text-foreground">{from}–{to}</span> из{' '}
        <span className="text-foreground">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="gap-1" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Назад
        </Button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e${idx}`} className="px-1.5 text-muted-foreground select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'ghost'}
              size="icon-sm"
              className={cn('h-8 w-8 tabular-nums', p === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button variant="ghost" size="sm" className="gap-1" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Вперёд
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
