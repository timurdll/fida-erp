/**
 * Форматирует дату в YYYY-MM-DD используя ЛОКАЛЬНЫЙ часовой пояс.
 * НЕ использовать toISOString() — она даёт UTC-дату и может
 * сдвинуть день на -1 для часовых поясов UTC+N ночью.
 */
export function toLocalDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Парсит строку YYYY-MM-DD в локальную дату без UTC-сдвига.
 * new Date('2026-06-18') интерпретируется как UTC-полночь — используем
 * ручной конструктор (y, m-1, d), чтобы получить локальную полночь.
 */
export function parseLocalDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
