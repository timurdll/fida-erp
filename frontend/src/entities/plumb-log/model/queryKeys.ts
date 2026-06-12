import type { PlumbLogFilters } from './types'

export const plumbLogKeys = {
  all: ['plumb-logs'] as const,
  lists: () => [...plumbLogKeys.all, 'list'] as const,
  list: (filters: PlumbLogFilters) => [...plumbLogKeys.lists(), filters] as const,
  detail: (id: number) => [...plumbLogKeys.all, 'detail', id] as const,
}
