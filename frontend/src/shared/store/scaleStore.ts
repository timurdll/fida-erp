import { create } from 'zustand'

interface ScaleState {
  weight: number | null // текущий вес в кг, null если нет данных
  isConnected: boolean // true когда WS открыт и пришло хотя бы одно значение
  setWeight: (weight: number) => void
  setConnected: (connected: boolean) => void
  disconnect: () => void // сбросить weight и isConnected
}

export const useScaleStore = create<ScaleState>((set) => ({
  weight: null,
  isConnected: false,
  setWeight: (weight) => set({ weight, isConnected: true }),
  setConnected: (connected) => set({ isConnected: connected }),
  disconnect: () => set({ weight: null, isConnected: false }),
}))
