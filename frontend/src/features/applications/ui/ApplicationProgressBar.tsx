'use client'

interface ApplicationProgressBarProps {
  shipped: number
  loading: number
  total: number
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ApplicationProgressBar({
  shipped,
  loading,
  total,
  showText = false,
  size = 'md',
}: ApplicationProgressBarProps) {
  const safe = total > 0 ? total : 1
  const shippedPct = Math.min((shipped / safe) * 100, 100)
  const loadingPct = Math.min((loading / safe) * 100, 100 - shippedPct)
  const remaining = Math.max(total - shipped - loading, 0)
  const remainingPct = Math.max(100 - shippedPct - loadingPct, 0)
  const valueLabel = `Отгружено ${shipped.toFixed(2)} м³, в процессе ${loading.toFixed(2)} м³, остаток ${remaining.toFixed(2)} м³`

  const height = showText
    ? size === 'sm'
      ? 'h-6'
      : size === 'lg'
        ? 'h-8'
        : 'h-7'
    : size === 'sm'
      ? 'h-1.5'
      : size === 'lg'
        ? 'h-4'
        : 'h-2.5'
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs'
  const segmentClass = `flex h-full min-w-0 items-center justify-center overflow-hidden px-1 text-center font-medium leading-none tabular-nums transition-all ${textSize}`
  const labeledSegmentMinWidth = showText ? '3.75rem' : undefined

  return (
    <div className="w-full">
      <div
        className={`relative flex w-full overflow-hidden rounded-full bg-muted ${height}`}
        title={showText ? valueLabel : undefined}
        aria-label={showText ? `Прогресс: ${valueLabel}` : undefined}
      >
        {shippedPct > 0 && (
          <div
            className={segmentClass}
            style={{
              width: `${shippedPct}%`,
              minWidth: labeledSegmentMinWidth,
              flexShrink: 0,
              backgroundColor: 'var(--success)',
              color: 'var(--primary-foreground)',
            }}
          >
            {showText && <span className="truncate">{shipped.toFixed(2)}</span>}
          </div>
        )}
        {loadingPct > 0 && (
          <div
            className={segmentClass}
            style={{
              width: `${loadingPct}%`,
              minWidth: labeledSegmentMinWidth,
              flexShrink: 0,
              backgroundColor: 'var(--warning)',
              color: 'var(--background-foreground)',
            }}
          >
            {showText && <span className="truncate">{loading.toFixed(2)}</span>}
          </div>
        )}
        {showText && remainingPct > 0 && (
          <div
            className={segmentClass}
            style={{
              width: `${remainingPct}%`,
              minWidth: labeledSegmentMinWidth,
              flexShrink: 1,
              backgroundColor: 'var(--muted)',
              color: 'var(--background-foreground)',
            }}
          >
            <span className="truncate">{remaining.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
