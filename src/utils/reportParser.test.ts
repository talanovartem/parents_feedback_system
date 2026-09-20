import { describe, it, expect } from 'vitest';
import { parseBatchAiResponse, buildSavedReport } from './reportParser';
import { Student } from '../types/feedback';

describe('reportParser', () => {
  const mockStudents: Student[] = [
    { id: 'std-1', classId: 'cls-1', name: 'Сидоренко Олена' },
    { id: 'std-2', classId: 'cls-1', name: 'Коваленко Тарас' },
    { id: 'std-3', classId: 'cls-1', name: 'Мельник Максим' },
  ];

  it('parses AI response using "=== ЗВІТ ДЛЯ: ... ===" format', () => {
    const rawAiOutput = `
Ось сформовані звіти:

=== ЗВІТ ДЛЯ: Сидоренко Олена ===
Шановні батьки Олени! 🌟
Олена чудово впоралася із завданнями на цьому тижні.
=== КІНЕЦЬ ЗВІТУ ===

=== ЗВІТ ДЛЯ: Коваленко Тарас ===
Шановні батьки Тараса! 💡
Тарас демонструє стабільний прогрес на заняттях.
=== КІНЕЦЬ ЗВІТУ ===
    `;

    const result = parseBatchAiResponse(rawAiOutput, mockStudents);

    expect(result.matched.length).toBe(2);
    expect(result.unmatched.length).toBe(0);

    expect(result.matched[0]).toEqual({
      studentId: 'std-1',
      studentName: 'Сидоренко Олена',
      content: 'Шановні батьки Олени! 🌟\nОлена чудово впоралася із завданнями на цьому тижні.',
    });

    expect(result.matched[1]).toEqual({
      studentId: 'std-2',
      studentName: 'Коваленко Тарас',
      content: 'Шановні батьки Тараса! 💡\nТарас демонструє стабільний прогрес на заняттях.',
    });
  });

  it('parses legacy format with "## Повідомлення для батьків: [Ім\'я]"', () => {
    const rawAiOutput = `
## Повідомлення для батьків: Мельник Максим (7-А)
Максим показує відмінні результати.
---

## Повідомлення для батьків: Коваленко Тарас
Тарас активно працював над проєктом.
---
    `;

    const result = parseBatchAiResponse(rawAiOutput, mockStudents);

    expect(result.matched.length).toBe(2);
    expect(result.matched[0].studentId).toBe('std-3');
    expect(result.matched[0].content).toContain('Максим показує відмінні результати.');
    expect(result.matched[1].studentId).toBe('std-2');
    expect(result.matched[1].content).toContain('Тарас активно працював над проєктом.');
  });

  it('identifies unmatched report blocks when student cannot be found', () => {
    const rawAiOutput = `
=== ЗВІТ ДЛЯ: Невідомий Студент ===
Текст для невідомого студента.
=== КІНЕЦЬ ЗВІТУ ===
    `;

    const result = parseBatchAiResponse(rawAiOutput, mockStudents);
    expect(result.matched.length).toBe(0);
    expect(result.unmatched.length).toBe(1);
    expect(result.unmatched[0]).toContain('Невідомий Студент');
  });

  it('builds a SavedReport object correctly', () => {
    const report = buildSavedReport('std-1', 'Поточний тиждень', 'Чудовий прогрес!');
    expect(report.id).toBe('std-1:Поточний тиждень');
    expect(report.studentId).toBe('std-1');
    expect(report.period).toBe('Поточний тиждень');
    expect(report.content).toBe('Чудовий прогрес!');
    expect(typeof report.updatedAt).toBe('string');
  });
});
