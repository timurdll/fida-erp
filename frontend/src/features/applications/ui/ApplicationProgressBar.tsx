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

  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'

  return (
    <div className="w-full">
      <div className={`flex w-full overflow-hidden rounded-full bg-muted ${height}`}>
        {shippedPct > 0 && (
          <div
            className="h-full shrink-0 transition-all"
            style={{ width: `${shippedPct}%`, backgroundColor: 'var(--success)' }}
          />
        )}
        {loadingPct > 0 && (
          <div
            className="h-full shrink-0 transition-all"
            style={{ width: `${loadingPct}%`, backgroundColor: 'var(--warning)' }}
          />
        )}
      </div>
      {showText && (
        <p className="mt-1 text-xs text-muted-foreground">
          {(shipped + loading).toFixed(2)}/{total.toFixed(2)} м³
        </p>
      )}
    </div>
  )
}
