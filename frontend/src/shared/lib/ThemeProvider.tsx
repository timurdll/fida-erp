'use client'

import { createContext, useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'fida-theme'
// Дефолт — тёмная тема, чтобы не сломать текущих пользователей (и совпасть с SSR <html class="dark">).
const DEFAULT_THEME: Theme = 'dark'

/**
 * Синхронный inline-скрипт, который исполняется ДО гидратации React и до первого
 * пэйнта: читает localStorage и ставит класс темы на <html>. Без него у пользователя
 * со светлой темой будет вспышка тёмной (FOUC) при загрузке. Дублирует логику
 * applyThemeClass намеренно — на момент его выполнения React-кода ещё нет.
 */
const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');t=(t==='light'||t==='dark')?t:'${DEFAULT_THEME}';var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(t);}catch(e){}})();`

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeClass(theme: Theme) {
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  el.classList.add(theme)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Инициализируем дефолтом (совпадает с серверным <html class="dark">), реальное
  // значение из localStorage подхватываем после монтирования — без рассинхрона гидратации.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initial: Theme = stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
    setThemeState(initial)
    applyThemeClass(initial)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyThemeClass(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage недоступен (private mode и т.п.) — тема просто не сохранится */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
      {children}
    </ThemeContext.Provider>
  )
}
