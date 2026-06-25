'use client'

import { useEffect, useState } from 'react'

/**
 * Клиентская пагинация по уже загруженному массиву.
 * Списки справочников грузятся целиком (<= ~1.5k записей), поэтому режем на странице.
 *
 * @param items    полный (отфильтрованный) массив
 * @param pageSize размер страницы
 * @param resetKey при изменении сбрасывает страницу на 1 (напр. строка поиска+фильтр)
 */
export function usePagination<T>(items: T[], pageSize = 20, resetKey?: unknown) {
  const [page, setPage] = useState(1)

  // Смена фильтров/поиска → на первую страницу
  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount) // клемп, если записей стало меньше
  const start = (safePage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return {
    page: safePage,
    setPage,
    pageItems,
    total,
    pageCount,
    pageSize,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}
