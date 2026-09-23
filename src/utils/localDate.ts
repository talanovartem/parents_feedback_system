/**
 * Локальна дата у форматі YYYY-MM-DD.
 * На відміну від `new Date().toISOString().slice(0, 10)` не зсуває день
 * у локальному часовому поясі вночі (UTC vs локальний пояс).
 */
export function toLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Поточна локальна дата у форматі YYYY-MM-DD. */
export function todayLocalIso(): string {
  return toLocalIsoDate(new Date());
}
