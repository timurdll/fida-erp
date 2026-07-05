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
  const segmentClass =
    'flex h-full min-w-0 items-center justify-center overflow-hidden px-1.5 text-center font-medium leading-none tabular-nums transition-all'
  const labelClass = `${size === 'sm' ? 'text-[11px]' : 'text-xs'} block whitespace-nowrap`
  const labeledSegmentMinWidth = size === 'sm' ? '3.5rem' : '3.75rem'
  const segmentStyle = (pct: number, backgroundColor: string, color: string) => ({
    flexBasis: showText ? 0 : `${pct}%`,
    flexGrow: showText ? pct : 0,
    flexShrink: showText ? 1 : 0,
    minWidth: showText ? labeledSegmentMinWidth : undefined,
    width: showText ? undefined : `${pct}%`,
    backgroundColor,
    color,
  })

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
            style={segmentStyle(
              shippedPct,
              'var(--success)',
              'var(--primary-foreground)',
            )}
          >
            {showText && (
              <span className={labelClass}>{shipped.toFixed(2)}</span>
            )}
          </div>
        )}
        {loadingPct > 0 && (
          <div
            className={segmentClass}
            style={segmentStyle(
              loadingPct,
              'var(--warning)',
              'var(--background-foreground)',
            )}
          >
            {showText && (
              <span className={labelClass}>{loading.toFixed(2)}</span>
            )}
          </div>
        )}
        {showText && remainingPct > 0 && (
          <div
            className={segmentClass}
            style={segmentStyle(
              remainingPct,
              'var(--muted)',
              'var(--background-foreground)',
            )}
          >
            <span className={labelClass}>{remaining.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
