import { describe, it, expect } from 'vitest';
import { calculateStudentAnalytics, generateAiPromptForParents } from './analytics';
import { DatabaseSchema, Student } from '../types/feedback';

describe('analytics module', () => {
  const mockStudent: Student = {
    id: 'std-1',
    classId: 'cls-6a',
    name: 'Олександр Шевченко',
    notes: 'Активний, любить англійську'
  };

  const mockDb: DatabaseSchema = {
    classes: [{ id: 'cls-6a', name: '6-А' }],
    students: [mockStudent],
    criteria: [
      { id: 'behavior', name: 'Поведінка' },
      { id: 'activity', name: 'Активність' }
    ],
    lessons: [
      { id: 'les-1', classId: 'cls-6a', date: '2026-09-15', lessonNumber: 1 },
      { id: 'les-2', classId: 'cls-6a', date: '2026-09-17', lessonNumber: 2 }
    ],
    records: {
      'std-1': {
        'les-1': {
          scores: { behavior: 10, activity: 12 },
          notes: 'Гарна відповідь біля дошки'
        },
        'les-2': {
          scores: { behavior: 8, activity: 10 },
          notes: ''
        }
      }
    }
  };

  it('calculates average scores correctly', () => {
    const analytics = calculateStudentAnalytics(mockStudent, mockDb);

    expect(analytics.averageScores.behavior).toBe(9); // (10 + 8) / 2
    expect(analytics.averageScores.activity).toBe(11); // (12 + 10) / 2
    expect(analytics.totalAverage).toBe(10); // (10+12+8+10)/4 = 10
    expect(analytics.lessonNotes.length).toBe(1);
    expect(analytics.lessonNotes[0].notes).toBe('Гарна відповідь біля дошки');
  });

  it('generates prompt with expected format and student info', () => {
    const analytics = calculateStudentAnalytics(mockStudent, mockDb);
    const prompt = generateAiPromptForParents(analytics, mockDb.criteria, '6-А', 'вересень 2026');

    expect(prompt).toContain('Олександр Шевченко');
    expect(prompt).toContain('6-А');
    expect(prompt).toContain('Поведінка: 9 / 12');
    expect(prompt).toContain('Активність: 11 / 12');
    expect(prompt).toContain('Гарна відповідь біля дошки');
    expect(prompt).toContain('Активний, любить англійську');
  });
});
