import { describe, it, expect } from 'vitest';
import { findNearestLessonId, getLessonBadgeInfo } from './lessonTime';
import { Lesson } from '../types/feedback';

describe('lessonTime utils', () => {
  const mockLessons: Lesson[] = [
    {
      id: 'les-24-1',
      classId: 'c-6a',
      date: '2026-09-24',
      lessonNumber: 1,
      time: '09:00 - 09:40',
      topic: 'Урок 1 четвер',
    },
    {
      id: 'les-24-2',
      classId: 'c-6a',
      date: '2026-09-24',
      lessonNumber: 2,
      time: '09:45 - 10:25',
      topic: 'Урок 2 четвер',
    },
    {
      id: 'les-25-1',
      classId: 'c-6a',
      date: '2026-09-25',
      lessonNumber: 1,
      time: '09:00 - 09:40',
      topic: 'Урок 1 п’ятниця',
    },
    {
      id: 'les-25-2',
      classId: 'c-6a',
      date: '2026-09-25',
      lessonNumber: 2,
      time: '09:45 - 10:25',
      topic: 'Урок 2 п’ятниця',
    },
  ];

  it('should pick the earliest upcoming lesson when looking ahead (e.g. on Sunday)', () => {
    // Неділя 20 вересня
    const sunday = new Date('2026-09-20T12:00:00');
    const nearestId = findNearestLessonId(mockLessons, sunday);
    // Найближчим має бути четвер 24.09 урок №1 (а не п'ятниця 25.09 урок №2!)
    expect(nearestId).toBe('les-24-1');

    const badge = getLessonBadgeInfo(mockLessons[0], true, sunday);
    expect(badge?.text).toBe('НАЙБЛИЖЧИЙ');
  });

  it('should pick the lesson running today', () => {
    // Четвер 24 вересня о 09:15 під час 1-го уроку
    const duringLesson1 = new Date('2026-09-24T09:15:00');
    const nearestId = findNearestLessonId(mockLessons, duringLesson1);
    expect(nearestId).toBe('les-24-1');

    const badge = getLessonBadgeInfo(mockLessons[0], true, duringLesson1);
    expect(badge?.text).toBe('СЬОГОДНІ');
    expect(badge?.isToday).toBe(true);
  });

  it('should advance to lesson 2 when lesson 1 is over', () => {
    // Четвер 24 вересня о 09:50 під час 2-го уроку
    const duringLesson2 = new Date('2026-09-24T09:50:00');
    const nearestId = findNearestLessonId(mockLessons, duringLesson2);
    expect(nearestId).toBe('les-24-2');
  });

  it('should pick the most recent past lesson if all lessons are in the past', () => {
    // Субота 26 вересня
    const saturday = new Date('2026-09-26T15:00:00');
    const nearestId = findNearestLessonId(mockLessons, saturday);
    // Найсвіжіший минулий — це п'ятниця 25.09 урок №2
    expect(nearestId).toBe('les-25-2');

    const badge = getLessonBadgeInfo(mockLessons[3], true, saturday);
    expect(badge?.text).toBe('ОСТАННІЙ');
  });

  it('should return null for empty lessons array', () => {
    expect(findNearestLessonId([])).toBeNull();
  });
});
