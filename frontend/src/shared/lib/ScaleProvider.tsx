'use client'

// Монтируется один раз в layout. Управляет reconnect-loop к весовому индикатору.
// Весовой WebSocket-сервер (Весы_27_05.exe) доступен только на машине весовщика
// на ws://localhost:8888; на всех остальных машинах соединение просто не открывается.

import { useEffect } from 'react'
import { useScaleStore } from '@/shared/store/scaleStore'

const SCALE_WS_URL = 'ws://localhost:8888'

export function ScaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let ws: WebSocket | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    function connect() {
      if (stopped) return
      let opened = false

      try {
        ws = new WebSocket(SCALE_WS_URL)
      } catch {
        // Конструктор может бросить синхронно — тихо пробуем позже
        useScaleStore.getState().disconnect()
        reconnectTimer = setTimeout(connect, 3000)
        return
      }

      // Если за 4с не открылись (CONNECTING завис) — закрываем; onclose переподключит
      const connectionTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) ws.close()
      }, 4000)

      ws.onopen = () => {
        opened = true
        clearTimeout(connectionTimeout)
      }

      ws.onmessage = (event) => {
        const raw = parseInt(String(event.data), 10)
        if (!Number.isNaN(raw)) {
          useScaleStore.getState().setWeight(raw) // значение уже приходит в кг
        }
      }

      ws.onerror = () => {
        // Сервер недоступен / сетевая ошибка — гасим индикатор
        useScaleStore.getState().disconnect()
      }

      ws.onclose = () => {
        clearTimeout(connectionTimeout)
        if (stopped) return
        // Сервер сам закрывает соединение после каждого показания → быстрый reconnect.
        // Если соединение не открывалось (сервер недоступен) — реже, чтобы не спамить консоль.
        reconnectTimer = setTimeout(connect, opened ? 500 : 3000)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
      useScaleStore.getState().disconnect()
    }
  }, [])

  return <>{children}</>
}
