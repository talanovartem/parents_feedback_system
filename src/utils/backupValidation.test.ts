import { describe, expect, it } from 'vitest';
import { createEmptyDatabase } from '../services/migration';
import { backupSummary, validateBackup } from './backupValidation';

describe('validateBackup', () => {
  it('приймає коректну базу і дає підсумок', () => {
    const db = createEmptyDatabase();
    db.classes.push({ id: 'c1', name: '6-А' });
    db.students.push({ id: 's1', classId: 'c1', name: 'Учень' });
    expect(backupSummary(validateBackup(db))).toMatchObject({ classes: 1, students: 1, lessons: 0 });
  });

  it('відхиляє JSON без даних та учня з невідомим класом', () => {
    expect(() => validateBackup({ hello: true })).toThrow();
    const db = createEmptyDatabase();
    db.students.push({ id: 's1', classId: 'missing', name: 'Учень' });
    expect(() => validateBackup(db)).toThrow('невідомий клас');
  });
});
