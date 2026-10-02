import { describe, expect, it } from 'vitest';
import { createEmptyDatabase } from '../services/migration';
import { mergeDatabase } from './mergeDatabase';

describe('mergeDatabase', () => {
  it('keeps a public feedback and a teacher edit made from the same base', () => {
    const base = createEmptyDatabase();
    const local = { ...base, classes: [{ id: 'a', name: '6-А' }] };
    const remote = { ...base, lessonFeedback: { 's:l': { id: 's:l', studentId: 's', lessonId: 'l', mood: 'normal' as const, selfGrade: 3, insight: 'Зрозумів тему', bonusGranted: false, createdAt: 'now' } } };
    const result = mergeDatabase(base, local, remote);
    expect(result.classes).toEqual(local.classes);
    expect(result.lessonFeedback).toEqual(remote.lessonFeedback);
  });

  it('adds independent KP balance changes and transactions', () => {
    const base = { ...createEmptyDatabase(), students: [{ id: 's', classId: 'c', name: 'Учень', karpatyPoints: 10 }] };
    const local = { ...base, students: [{ ...base.students[0], karpatyPoints: 15 }], kpTransactions: [{ id: 'manual', studentId: 's', amount: 5, reason: 'Бонус', createdAt: 'now' }] };
    const remote = { ...base, students: [{ ...base.students[0], karpatyPoints: 12 }], kpTransactions: [{ id: 'feedback', studentId: 's', amount: 2, reason: 'Відгук', createdAt: 'now' }] };
    const result = mergeDatabase(base, local, remote);
    expect(result.students[0].karpatyPoints).toBe(17);
    expect(result.kpTransactions).toHaveLength(2);
  });

  it('does not silently overwrite competing edits to the same field', () => {
    const base = { ...createEmptyDatabase(), classes: [{ id: 'a', name: '6-А' }] };
    expect(() => mergeDatabase(base, { ...base, classes: [{ id: 'a', name: '6-Б' }] }, { ...base, classes: [{ id: 'a', name: '6-В' }] })).toThrow();
  });
});
