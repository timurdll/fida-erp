import type { ApplicationFilters } from './types'

export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters: ApplicationFilters) => [...applicationKeys.lists(), filters] as const,
  detail: (id: number) => [...applicationKeys.all, 'detail', id] as const,
}
