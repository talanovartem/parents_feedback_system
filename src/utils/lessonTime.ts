import { Lesson } from '../types/feedback';
import { toLocalIsoDate } from './localDate';

/**
 * Отримує мілісекундний timestamp початку уроку за датою, часом та номером.
 */
export function getLessonTimestamp(lesson: Lesson): number {
  let timeStr = '09:00';

  if (lesson.time) {
    const match = lesson.time.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      timeStr = `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  } else {
    // Приблизний час за номером уроку
    const hours = 8 + (lesson.lessonNumber || 1);
    timeStr = `${String(hours).padStart(2, '0')}:00`;
  }

  const isoFull = `${lesson.date}T${timeStr}:00`;
  const parsed = new Date(isoFull).getTime();
  return isNaN(parsed) ? new Date(`${lesson.date}T12:00:00`).getTime() : parsed;
}

/**
 * Знаходить ID уроку, який є найближчим за датою та часом до поточного моменту.
 * 
 * Логіка:
 * 1. Якщо є уроки сьогодні або в майбутньому (>= зараз - 45 хв тривалість уроку),
 *    обирається найперший із них (найближчий до проведення або той, що триває прямо зараз).
 * 2. Якщо всі уроки вже відбулися (в минулому), обирається найсвіжіший минулий урок.
 */
export function findNearestLessonId(lessons: Lesson[], referenceDate: Date = new Date()): string | null {
  if (!lessons || lessons.length === 0) return null;

  const refMs = referenceDate.getTime();
  // Похибка 45 хв — урок, що розпочався 40 хв тому, вважається активним/поточним
  const currentThreshold = refMs - 45 * 60 * 1000;

  const upcomingOrCurrent: { lesson: Lesson; timestamp: number }[] = [];
  const past: { lesson: Lesson; timestamp: number }[] = [];

  for (const l of lessons) {
    const ts = getLessonTimestamp(l);
    if (ts >= currentThreshold) {
      upcomingOrCurrent.push({ lesson: l, timestamp: ts });
    } else {
      past.push({ lesson: l, timestamp: ts });
    }
  }

  // Якщо є поточні або майбутні — обираємо найближчий майбутній (з найменшим timestamp)
  if (upcomingOrCurrent.length > 0) {
    upcomingOrCurrent.sort((a, b) => a.timestamp - b.timestamp);
    return upcomingOrCurrent[0].lesson.id;
  }

  // Якщо всі в минулому — обираємо найсвіжіший минулий (з найбільшим timestamp)
  past.sort((a, b) => b.timestamp - a.timestamp);
  return past[0].lesson.id;
}

export interface LessonBadgeInfo {
  text: string;
  badgeClass: string;
  isToday: boolean;
}

/**
 * Повертає бейдж для найближчого / поточного уроку
 */
export function getLessonBadgeInfo(
  lesson: Lesson,
  isNearest: boolean,
  referenceDate: Date = new Date()
): LessonBadgeInfo | null {
  if (!isNearest) return null;

  const todayIso = toLocalIsoDate(referenceDate);

  if (lesson.date === todayIso) {
    return {
      text: 'СЬОГОДНІ',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isToday: true,
    };
  }

  if (lesson.date > todayIso) {
    return {
      text: 'НАЙБЛИЖЧИЙ',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      isToday: false,
    };
  }

  return {
    text: 'ОСТАННІЙ',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    isToday: false,
  };
}
