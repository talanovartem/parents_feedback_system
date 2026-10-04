import { toLocalIsoDate } from './localDate';

export function shiftScheduleDate(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

export function getScheduleWeekDates(dateIso: string): string[] {
  const [year, month, day] = dateIso.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  const distanceToMonday = weekday === 0 ? -6 : 1 - weekday;
  const monday = shiftScheduleDate(dateIso, distanceToMonday);
  return Array.from({ length: 7 }, (_, index) => shiftScheduleDate(monday, index));
}
