import { describe, it, expect } from 'vitest';
import {
  calculateStudentAnalytics,
  calculateStudentTrend,
  generateAiPromptForParents,
  generateBatchAiPrompt,
  getAllParallels,
} from './analytics';
import { DatabaseSchema, Student } from '../types/feedback';

describe('analytics module', () => {
  const mockStudent: Student = {
    id: 'std-1',
    classId: 'cls-6a',
    name: 'Олександр Шевченко',
    notes: 'Активний, любить англійську'
  };

  const mockStudent2: Student = {
    id: 'std-2',
    classId: 'cls-6b',
    name: 'Марія Ковальчук',
    notes: 'Потребує додаткового часу на завдання'
  };

  const mockDb: DatabaseSchema = {
    classes: [
      { id: 'cls-6a', name: '6-А' },
      { id: 'cls-6b', name: '6-Б' }
    ],
    students: [mockStudent, mockStudent2],
    criteria: [
      { id: 'behavior', name: 'Поведінка' },
      { id: 'activity', name: 'Активність' }
    ],
    lessons: [
      { id: 'les-1', classId: 'cls-6a', date: '2026-09-15', lessonNumber: 1, topic: 'Вступ' },
      { id: 'les-2', classId: 'cls-6a', date: '2026-09-17', lessonNumber: 2, topic: 'Частини мови' },
      { id: 'les-3', classId: 'cls-6a', date: '2026-09-18', lessonNumber: 3, topic: 'Стилі мовлення' },
      { id: 'les-4', classId: 'cls-6b', date: '2026-09-15', lessonNumber: 1, topic: 'Вступ' }
    ],
    records: {
      'std-1': {
        'les-1': {
          scores: { behavior: 8, activity: 8 },
          notes: 'Початок теми'
        },
        'les-2': {
          scores: { behavior: 10, activity: 12 },
          notes: 'Гарна відповідь'
        },
        'les-3': {
          absent: true,
          scores: { behavior: 2, activity: 2 },
          notes: 'Хворів'
        }
      },
      'std-2': {
        'les-4': {
          scores: { behavior: 11, activity: 10 },
          notes: 'Чудова робота'
        }
      }
    }
  };

  it('calculates average scores correctly and ignores absent lessons', () => {
    const analytics = calculateStudentAnalytics(mockStudent, mockDb);

    expect(analytics.averageScores.behavior).toBe(9); // (8 + 10) / 2 = 9 (les-3 ігнорується!)
    expect(analytics.averageScores.activity).toBe(10); // (8 + 12) / 2 = 10
    expect(analytics.totalAverage).toBe(9.5); // (8+8+10+12)/4 = 9.5
    expect(analytics.totalLessons).toBe(3);
    expect(analytics.absentLessonsCount).toBe(1);
    expect(analytics.attendedLessonsCount).toBe(2);
    expect(analytics.lessonNotes.length).toBe(3);
  });

  it('generates prompt with expected format and student info', () => {
    const analytics = calculateStudentAnalytics(mockStudent, mockDb);
    const prompt = generateAiPromptForParents(analytics, mockDb.criteria, '6-А', 'вересень 2026');

    expect(prompt).toContain('Олександр Шевченко');
    expect(prompt).toContain('6-А');
    expect(prompt).toContain('Поведінка: 9 / 12');
    expect(prompt).toContain('Активність: 10 / 12');
    expect(prompt).toContain('Гарна відповідь');
    expect(prompt).toContain('Активний, любить англійську');
  });

  it('calculates chronological student trend accurately', () => {
    const trend = calculateStudentTrend(mockStudent, mockDb);

    expect(trend.totalCount).toBe(3);
    expect(trend.attendedCount).toBe(2);
    expect(trend.absentCount).toBe(1);
    expect(trend.points.length).toBe(3);

    // Перший урок: бал 8, другий: бал 11. Динаміка від 8 до 11 -> зростання
    expect(trend.points[0].averageScore).toBe(8);
    expect(trend.points[1].averageScore).toBe(11);
    expect(trend.points[2].absent).toBe(true);

    expect(trend.previousAverage).toBe(8);
    expect(trend.recentAverage).toBe(11);
    expect(trend.difference).toBe(3);
    expect(trend.trendDirection).toBe('up');
  });

  it('generates unified batch AI prompt for multiple students across parallel classes', () => {
    const batchData = [
      {
        student: mockStudent,
        className: '6-А',
        analytics: calculateStudentAnalytics(mockStudent, mockDb)
      },
      {
        student: mockStudent2,
        className: '6-Б',
        analytics: calculateStudentAnalytics(mockStudent2, mockDb)
      }
    ];

    const prompt = generateBatchAiPrompt(batchData, mockDb.criteria, 'Паралель 6-х класів', '15-20 вересня');

    expect(prompt).toContain('Паралель 6-х класів');
    expect(prompt).toContain('15-20 вересня');
    expect(prompt).toContain('УЧЕНЬ №1: Олександр Шевченко (6-А)');
    expect(prompt).toContain('Індивідуальні особливості учня (контекст для вчителя, врахуй делікатно): Активний, любить англійську');
    expect(prompt).toContain('УЧЕНЬ №2: Марія Ковальчук (6-Б)');
    expect(prompt).toContain('Індивідуальні особливості учня (контекст для вчителя, врахуй делікатно): Потребує додаткового часу на завдання');
    expect(prompt).toContain('## Повідомлення для батьків: [Ім\'я учня] ([Клас])');
  });

  it('groups classes into parallels correctly for all grade levels', () => {
    const classes = [
      { id: 'c1', name: '6-А' },
      { id: 'c2', name: '6-В' },
      { id: 'c3', name: '7-А' },
      { id: 'c4', name: '7-Б' },
      { id: 'c5', name: '8-А' },
      { id: 'c6', name: '8-Б' },
      { id: 'c7', name: '9-А' },
      { id: 'c8', name: '9-Б' },
      { id: 'c9', name: '10-А' },
      { id: 'c10', name: '10-Б' },
      { id: 'c11', name: '11' } // одиночний клас
    ];

    const parallels = getAllParallels(classes);

    expect(parallels.length).toBe(5); // 6, 7, 8, 9, 10
    expect(parallels[0].grade).toBe('6');
    expect(parallels[0].classes.map((c) => c.name)).toEqual(['6-А', '6-В']);
    expect(parallels[1].grade).toBe('7');
    expect(parallels[2].grade).toBe('8');
    expect(parallels[3].grade).toBe('9');
    expect(parallels[4].grade).toBe('10');
  });
});
