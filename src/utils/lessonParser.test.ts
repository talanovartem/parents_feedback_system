import { describe, it, expect } from 'vitest';
import { parseLessonsInput } from './lessonParser';
import { ClassItem, Lesson } from '../types/feedback';

describe('lessonParser', () => {
  const mockClasses: ClassItem[] = [
    { id: 'c-6a', name: '6-А' },
    { id: 'c-6v', name: '6-В' },
    { id: 'c-10v', name: '10-В' },
  ];

  it('should parse tab or pipe separated lines with dates and topics', () => {
    const text = `
01.09.2026 | 6-А | 1 | Вступний урок. Знайомство
02.09.2026 | 6-В | 2 | Повторення правил
    `.trim();

    const parsed = parseLessonsInput(text, mockClasses, 'c-6a');
    expect(parsed).toHaveLength(2);

    expect(parsed[0].date).toBe('2026-09-01');
    expect(parsed[0].classId).toBe('c-6a');
    expect(parsed[0].lessonNumber).toBe(1);
    expect(parsed[0].topic).toBe('Вступний урок. Знайомство');

    expect(parsed[1].date).toBe('2026-09-02');
    expect(parsed[1].classId).toBe('c-6v');
    expect(parsed[1].lessonNumber).toBe(2);
    expect(parsed[1].topic).toBe('Повторення правил');
  });

  it('should parse free-form text with class names and dates', () => {
    const text = `
1. 05.09.2026 10-В Past Continuous vs Past Simple
2. 06.09.2026 6-А: Unit 1 Reading practice
    `.trim();

    const parsed = parseLessonsInput(text, mockClasses, 'c-6a');
    expect(parsed).toHaveLength(2);

    expect(parsed[0].classId).toBe('c-10v');
    expect(parsed[0].date).toBe('2026-09-05');
    expect(parsed[0].topic).toContain('Past Continuous');

    expect(parsed[1].classId).toBe('c-6a');
    expect(parsed[1].date).toBe('2026-09-06');
    expect(parsed[1].topic).toContain('Unit 1 Reading practice');
  });

  it('should fall back to default class if no class is mentioned in the line', () => {
    const text = `2026-09-10 №1 Контрольна робота`;
    const parsed = parseLessonsInput(text, mockClasses, 'c-10v');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].classId).toBe('c-10v');
    expect(parsed[0].lessonNumber).toBe(1);
    expect(parsed[0].topic).toBe('Контрольна робота');
  });

  it('should detect existing duplicate lessons and unselect them by default', () => {
    const existing: Lesson[] = [
      { id: 'ex-1', classId: 'c-6a', date: '2026-09-01', lessonNumber: 1, topic: 'Старий урок' },
    ];

    const text = `01.09.2026 6-А №1 Нова тема`;
    const parsed = parseLessonsInput(text, mockClasses, 'c-6a', existing);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].isDuplicate).toBe(true);
    expect(parsed[0].selected).toBe(false);
  });

  it('should handle multi-class syllabus text', () => {
    const text = `
08.09.2026 | 6-А | Вступний тест
08.09.2026 | 6-В | Діагностична робота
09.09.2026 | 10-В | Unit 1 Essay Writing
    `.trim();

    const parsed = parseLessonsInput(text, mockClasses, 'c-6a');
    expect(parsed).toHaveLength(3);
    expect(parsed[0].classId).toBe('c-6a');
    expect(parsed[1].classId).toBe('c-6v');
    expect(parsed[2].classId).toBe('c-10v');
    expect(parsed[2].topic).toBe('Unit 1 Essay Writing');
  });
});
