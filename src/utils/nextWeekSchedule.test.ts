import { describe, expect, it } from 'vitest';
import { suggestNextWeekLessons } from './nextWeekSchedule';
import { Lesson } from '../types/feedback';

const lesson = (id: string, date: string, classId = 'c1', time = '09:00 - 09:45'): Lesson => ({ id, date, classId, lessonNumber: 1, time, topic: 'Тема, яку не копіюємо' });

describe('suggestNextWeekLessons', () => {
  const wednesday = new Date(2026, 8, 30);

  it('переносить лише уроки поточного тижня на сім днів вперед', () => {
    expect(suggestNextWeekLessons([
      lesson('old', '2026-09-22'), lesson('a', '2026-09-28'), lesson('b', '2026-10-02', 'c2'), lesson('future', '2026-10-12'),
    ], wednesday)).toEqual([
      { sourceLessonId: 'a', date: '2026-10-05', classId: 'c1', lessonNumber: 1, time: '09:00 - 09:45' },
      { sourceLessonId: 'b', date: '2026-10-09', classId: 'c2', lessonNumber: 1, time: '09:00 - 09:45' },
    ]);
  });

  it('не пропонує уроки, що вже створені, та прибирає дублікати джерела', () => {
    expect(suggestNextWeekLessons([
      lesson('a', '2026-09-28'), lesson('duplicate', '2026-09-28'), lesson('existing', '2026-10-05', 'c1', '10:00 - 10:45'),
    ], wednesday)).toEqual([]);
  });

  it('працює на межі року', () => {
    expect(suggestNextWeekLessons([lesson('a', '2026-12-31')], new Date(2026, 11, 31))[0].date).toBe('2027-01-07');
  });
});
