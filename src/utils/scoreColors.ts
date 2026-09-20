/**
 * Кольорове кодування для шкали 0-12
 */
export function getScoreBadgeClass(score?: number): string {
  if (score === undefined || score === null || isNaN(score)) {
    return 'bg-slate-100 text-slate-400 border-slate-200';
  }

  if (score >= 10) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
  }
  if (score >= 7) {
    return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
  }
  if (score >= 4) {
    return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
  }
  if (score > 0) {
    return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  }
  return 'bg-slate-100 text-slate-500 border-slate-300';
}

/**
 * Валідація значення в діапазоні 0..12
 */
export function sanitizeScore(val: number | string): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return Math.min(12, Math.max(0, Math.round(num)));
}
