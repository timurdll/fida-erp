'use client'

import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export interface MobileCardProps {
  onClick?: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Статус / материал — любой ReactNode, показывается справа от title */
  badge?: React.ReactNode
  /** Вторичные поля — выводятся сеткой 2 колонки */
  rows?: { label: string; value: React.ReactNode }[]
  /** Слот в правом верхнем углу (напр. кнопка «...») */
  actions?: React.ReactNode
  className?: string
  /** Полупрозрачность (напр. неполный отвес) */
  muted?: boolean
}

/**
 * Переиспользуемая карточка для мобильного представления таблиц (< md).
 * Десктоп/планшет рендерят обычную таблицу — эта карточка только под `md:hidden`.
 */
export function MobileCard({
  onClick,
  title,
  subtitle,
  badge,
  rows,
  actions,
  className,
  muted,
}: MobileCardProps) {
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'mb-3 rounded-lg border border-border bg-card p-4 transition-colors',
        interactive && 'cursor-pointer active:bg-background-elevated',
        muted && 'opacity-60',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            {badge}
          </div>
          {subtitle != null && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {rows.map((r, i) => (
            <div key={i} className="min-w-0">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <div className="truncate text-sm text-foreground">{r.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
