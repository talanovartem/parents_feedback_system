import { describe, it, expect } from 'vitest';
import { getPeriodPresets, filterLessonsByDateRange } from './periodHelper';
import { Lesson } from '../types/feedback';

describe('periodHelper', () => {
  it('generates period presets including current week, previous week, month and quarter', () => {
    // 2026-09-20 (неділя)
    const testDate = new Date(2026, 8, 20); // вересень = місяць 8
    const presets = getPeriodPresets(testDate);

    expect(presets.length).toBeGreaterThanOrEqual(5);

    const currentWeek = presets.find((p) => p.id === 'current-week');
    expect(currentWeek).toBeDefined();
    // Понеділок того ж тижня: 14.09.2026, Неділя: 20.09.2026
    expect(currentWeek?.description).toContain('14.09.2026 – 20.09.2026');

    const prevWeek = presets.find((p) => p.id === 'previous-week');
    expect(prevWeek).toBeDefined();
    expect(prevWeek?.description).toContain('07.09.2026 – 13.09.2026');

    const currentMonth = presets.find((p) => p.id === 'current-month');
    expect(currentMonth?.description).toContain('вересень 2026');
  });

  it('filters lessons correctly by date range', () => {
    const lessons: Lesson[] = [
      { id: '1', classId: 'c1', date: '2026-09-10', lessonNumber: 1 },
      { id: '2', classId: 'c1', date: '2026-09-15', lessonNumber: 2 },
      { id: '3', classId: 'c1', date: '2026-09-22', lessonNumber: 3 },
    ];

    const filtered = filterLessonsByDateRange(lessons, '2026-09-14', '2026-09-20');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('2');
  });
});
