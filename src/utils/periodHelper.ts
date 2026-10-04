import { Lesson } from '../types/feedback';

export interface PeriodPreset {
  id: string;
  label: string;
  description: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface ReportPeriod {
  text: string;
  startDate: string;
  endDate: string;
}

const REPORT_PERIOD_KEY = 'parents-feedback-report-period';

export function getReportPeriod(): ReportPeriod {
  const preset = getPeriodPresets()[0];
  const fallback = { text: preset.description, startDate: preset.startDate!, endDate: preset.endDate! };
  try {
    const saved = JSON.parse(localStorage.getItem(REPORT_PERIOD_KEY) || 'null');
    return saved && typeof saved.text === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(saved.startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(saved.endDate)
      ? saved as ReportPeriod : fallback;
  } catch {
    return fallback;
  }
}

export function saveReportPeriod(period: ReportPeriod): void {
  try {
    localStorage.setItem(REPORT_PERIOD_KEY, JSON.stringify(period));
  } catch {
    // Звіт працює й тоді, коли браузер блокує локальне сховище.
  }
}

export function describePeriodDuration(startDate: string, endDate: string): string {
  const days = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
  if (days === 7) return 'один тиждень';
  if (days === 14) return 'два тижні';
  return `${days} календарних днів`;
}

function formatDateDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatISODate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Отримання списку типових звітних періодів:
 * - Поточний тиждень (за замовчуванням)
 * - Минулий тиждень
 * - Поточний місяць
 * - Чверті та семестри
 */
export function getPeriodPresets(referenceDate: Date = new Date()): PeriodPreset[] {
  const current = new Date(referenceDate);
  const dayOfWeek = current.getDay(); // 0 = нд, 1 = пн...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // Поточний тиждень: понеділок - неділя
  const currMonday = new Date(current);
  currMonday.setDate(current.getDate() + distanceToMonday);
  const currSunday = new Date(currMonday);
  currSunday.setDate(currMonday.getDate() + 6);

  // Минулий тиждень
  const prevMonday = new Date(currMonday);
  prevMonday.setDate(currMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const monthNames = [
    'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
    'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'
  ];

  const year = current.getFullYear();
  const monthIdx = current.getMonth();
  const currentMonthName = monthNames[monthIdx];
  const prevMonthIdx = (monthIdx + 11) % 12;
  const prevMonthYear = monthIdx === 0 ? year - 1 : year;
  const prevMonthName = monthNames[prevMonthIdx];

  return [
    {
      id: 'current-week',
      label: 'Поточний тиждень',
      description: `${formatDateDMY(currMonday)} – ${formatDateDMY(currSunday)}`,
      startDate: formatISODate(currMonday),
      endDate: formatISODate(currSunday),
    },
    {
      id: 'previous-week',
      label: 'Минулий тиждень',
      description: `${formatDateDMY(prevMonday)} – ${formatDateDMY(prevSunday)}`,
      startDate: formatISODate(prevMonday),
      endDate: formatISODate(prevSunday),
    },
    {
      id: 'current-month',
      label: `Місяць (${currentMonthName})`,
      description: `${currentMonthName} ${year}`,
      startDate: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
      endDate: `${year}-${String(monthIdx + 1).padStart(2, '0')}-31`,
    },
    {
      id: 'previous-month',
      label: `Минулий місяць (${prevMonthName})`,
      description: `${prevMonthName} ${prevMonthYear}`,
      startDate: `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-01`,
      endDate: `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-31`,
    },
    {
      id: 'q1',
      label: 'I чверть (осінь)',
      description: `I чверть (вересень – жовтень ${year})`,
      startDate: `${year}-09-01`,
      endDate: `${year}-10-31`,
    },
    {
      id: 'q2',
      label: 'II чверть (зима)',
      description: `II чверть (листопад – грудень ${year})`,
      startDate: `${year}-11-01`,
      endDate: `${year}-12-31`,
    },
    {
      id: 'sem1',
      label: 'I семестр',
      description: `I семестр ${year}/${year + 1}`,
      startDate: `${year}-09-01`,
      endDate: `${year}-12-31`,
    },
    {
      id: 'sem2',
      label: 'II семестр',
      description: `II семестр ${year + 1}`,
      startDate: `${year + 1}-01-10`,
      endDate: `${year + 1}-05-31`,
    },
    {
      id: 'custom',
      label: 'Власний період...',
      description: `${formatDateDMY(currMonday)} – ${formatDateDMY(currSunday)}`,
    },
  ];
}

/**
 * Фільтрація уроків за вибраним періодом
 */
export function filterLessonsByDateRange(
  lessons: Lesson[],
  startDate?: string,
  endDate?: string
): Lesson[] {
  if (!startDate && !endDate) return lessons;

  return lessons.filter((lesson) => {
    if (startDate && lesson.date < startDate) return false;
    if (endDate && lesson.date > endDate) return false;
    return true;
  });
}
