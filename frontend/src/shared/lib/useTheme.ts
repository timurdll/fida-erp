'use client'

import { useContext } from 'react'
import { ThemeContext } from './ThemeProvider'

/**
 * Доступ к текущей теме и переключателям. Возвращает { theme, setTheme, toggleTheme }.
 * Должен использоваться внутри <ThemeProvider> (смонтирован в корневом layout).
 */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme должен использоваться внутри <ThemeProvider>')
  }
  return ctx
}
