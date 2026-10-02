import { describe, expect, it } from 'vitest';
import { createEmptyDatabase } from '../services/migration';
import { getAssessmentRows } from './selfAssessment';

describe('getAssessmentRows', () => {
  it('flags a large gap only when there is an actual lesson grade', () => {
    const db = createEmptyDatabase();
    const lesson = { id: 'l', classId: 'c', date: '2026-10-01', lessonNumber: 1 };
    const students = [{ id: 's', classId: 'c', name: 'Учень' }];
    const criteria = [{ id: 'grade', name: 'Оцінка за урок' }, { id: 'mood', name: 'Стан дитини' }];
    db.records = { s: { l: { scores: { grade: 3, mood: 12 } } } };
    const feedback = [{ id: 's:l', studentId: 's', lessonId: 'l', mood: 'normal' as const, selfGrade: 4, insight: 'Зрозумів тему', bonusGranted: false, createdAt: 'now' }];
    expect(getAssessmentRows(lesson, students, criteria, db, feedback)[0]).toMatchObject({ teacherScore: 3, teacherLevel: 1, needsAttention: true });
    db.records.s.l.scores = { mood: 12 };
    expect(getAssessmentRows(lesson, students, criteria, db, feedback)[0]).toMatchObject({ needsAttention: false });
  });
});
