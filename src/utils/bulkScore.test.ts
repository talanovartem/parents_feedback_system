import { describe, expect, it } from 'vitest';
import { createEmptyDatabase } from '../services/migration';
import { fillLessonScores } from './bulkScore';

describe('fillLessonScores', () => {
  it('заповнює тільки порожні клітинки присутніх і залишає попередні оцінки', () => {
    const db = createEmptyDatabase();
    db.classes = [{ id: 'c1', name: '8-А' }];
    db.students = ['s1', 's2', 's3'].map((id) => ({ id, classId: 'c1', name: id }));
    db.lessons = [{ id: 'l1', classId: 'c1', date: '2026-10-01', lessonNumber: 1 }];
    db.records = { s1: { l1: { scores: { work: 9 } } }, s3: { l1: { absent: true, scores: {} } } };

    const result = fillLessonScores(db, 'l1', 'work', 12, true);
    expect(result.records.s1.l1.scores.work).toBe(9);
    expect(result.records.s2.l1.scores.work).toBe(12);
    expect(result.records.s3.l1.scores.work).toBeUndefined();
    expect(fillLessonScores(result, 'l1', 'work', 12, true)).toBe(result);
  });
});
