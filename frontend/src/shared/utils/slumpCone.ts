/** Осадка конуса: одиночное число «22» или диапазон «22-23» (допускаются десятичные). */
export const SLUMP_CONE_RE = /^\d+([.,]\d+)?(\s*-\s*\d+([.,]\d+)?)?$/

/** Пустое значение считается валидным (поле необязательно). */
export function isValidSlumpCone(v?: string | null): boolean {
  return !v || SLUMP_CONE_RE.test(String(v).trim())
}
