import { Lesson } from '../types/feedback';
import { toLocalIsoDate } from './localDate';

export interface NextWeekSuggestion {
  date: string;
  classId: string;
  lessonNumber: number;
  time?: string;
  sourceLessonId: string;
}

/** Повторює лише структуру поточного тижня; теми та результати не переносяться. */
export function suggestNextWeekLessons(lessons: Lesson[], today = new Date()): NextWeekSuggestion[] {
  const day = today.getDay() || 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day + 1);
  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const nextEnd = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 6);
  const from = toLocalIsoDate(monday);
  const to = toLocalIsoDate(nextMonday);
  const nextTo = toLocalIsoDate(nextEnd);

  const existing = new Set(lessons.filter((lesson) => lesson.date >= to && lesson.date <= nextTo)
    .map((lesson) => `${lesson.date}|${lesson.classId}|${lesson.lessonNumber}`));
  const proposed = new Set<string>();

  return lessons.filter((lesson) => lesson.date >= from && lesson.date < to).flatMap((lesson) => {
    const [year, month, date] = lesson.date.split('-').map(Number);
    const target = new Date(year, month - 1, date + 7);
    const targetDate = toLocalIsoDate(target);
    const key = `${targetDate}|${lesson.classId}|${lesson.lessonNumber}`;
    if (existing.has(key) || proposed.has(key)) return [];
    proposed.add(key);
    return [{ date: targetDate, classId: lesson.classId, lessonNumber: lesson.lessonNumber, time: lesson.time, sourceLessonId: lesson.id }];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '') || a.lessonNumber - b.lessonNumber);
}
