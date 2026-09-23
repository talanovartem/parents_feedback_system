import { describe, it, expect } from 'vitest';
import { applyFeedbackToDb } from './feedbackStore';
import { createEmptyDatabase } from '../services/migration';
import { DatabaseSchema, StudentLessonFeedback } from '../types/feedback';

function makeDb(): DatabaseSchema {
  const db = createEmptyDatabase();
  db.classes.push({ id: 'c1', name: '8-А' });
  db.students.push({ id: 's1', classId: 'c1', name: 'Учень', karpatyPoints: 10 });
  db.lessons.push({ id: 'l1', classId: 'c1', date: '2026-09-22', lessonNumber: 1 });
  return db;
}

function fb(overrides: Partial<StudentLessonFeedback> = {}): StudentLessonFeedback {
  return {
    id: 's1:l1',
    studentId: 's1',
    lessonId: 'l1',
    mood: 'excited',
    selfGrade: 4,
    insight: 'Написав програму і зрозумів цикли',
    bonusGranted: true,
    karpatyPointsEarned: 2,
    createdAt: '2026-09-22T10:00:00.000Z',
    ...overrides,
  };
}

describe('applyFeedbackToDb', () => {
  it('перший фідбек додає бали й пише транзакцію', () => {
    const res = applyFeedbackToDb(makeDb(), fb());
    expect(res.students[0].karpatyPoints).toBe(12);
    expect(res.kpTransactions).toHaveLength(1);
    expect(res.kpTransactions![0].amount).toBe(2);
    expect(res.lessonFeedback?.['s1:l1']).toBeDefined();
  });

  it('повторний сабміт не подвоює бали (лише різниця)', () => {
    const db = applyFeedbackToDb(makeDb(), fb());
    const res = applyFeedbackToDb(db, fb({ karpatyPointsEarned: 2 }));
    expect(res.students[0].karpatyPoints).toBe(12);
    expect(res.kpTransactions).toHaveLength(1);
  });

  it('редагування зі зменшенням бонусу віднімає різницю', () => {
    const db = applyFeedbackToDb(makeDb(), fb());
    const res = applyFeedbackToDb(db, fb({ karpatyPointsEarned: 0, bonusGranted: false }));
    expect(res.students[0].karpatyPoints).toBe(10);
    expect(res.kpTransactions).toHaveLength(2);
    expect(res.kpTransactions![1].amount).toBe(-2);
  });

  it('фідбек без балів не чіпає транзакції', () => {
    const res = applyFeedbackToDb(makeDb(), fb({ karpatyPointsEarned: 0, bonusGranted: false }));
    expect(res.students[0].karpatyPoints).toBe(10);
    expect(res.kpTransactions).toHaveLength(0);
  });
});
