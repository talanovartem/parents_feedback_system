import { describe, it, expect } from 'vitest';
import {
  migrateDatabase,
  createEmptyDatabase,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_CRITERIA,
  guessGender,
  generateStudentPin,
  generateAccessCode,
} from './migration';

describe('migration service', () => {
  it('creates an empty database with CURRENT_SCHEMA_VERSION, savedReports, lessonFeedback, attentionTasks, kpTransactions and default criteria', () => {
    const db = createEmptyDatabase();
    expect(db.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.version).toBe(4);
    expect(db.classes).toEqual([]);
    expect(db.students).toEqual([]);
    expect(db.lessons).toEqual([]);
    expect(db.records).toEqual({});
    expect(db.sentReports).toEqual({});
    expect(db.savedReports).toEqual({});
    expect(db.lessonFeedback).toEqual({});
    expect(db.attentionTasks).toEqual([]);
    expect(db.kpTransactions).toEqual([]);
    expect(db.criteria).toEqual(DEFAULT_CRITERIA);
  });

  it('correctly guesses gender for Ukrainian names', () => {
    expect(guessGender('Сидоренко Олена')).toBe('female');
    expect(guessGender('Марія')).toBe('female');
    expect(guessGender('Коваль Софія')).toBe('female');
    expect(guessGender('Шевченко Іван')).toBe('male');
    expect(guessGender('Артем')).toBe('male');
    expect(guessGender('Олександр')).toBe('male');
  });

  it('generates consistent 4-digit student PINs', () => {
    const pin1 = generateStudentPin('std-1');
    const pin2 = generateStudentPin('std-1');
    expect(pin1).toBe(pin2);
    expect(pin1.length).toBe(4);
    expect(Number(pin1)).toBeGreaterThanOrEqual(1000);
    expect(Number(pin1)).toBeLessThanOrEqual(9999);
  });

  it('generates 6-digit access codes', () => {
    const code = generateAccessCode();
    expect(code.length).toBe(6);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThanOrEqual(999999);
  });

  it('handles null, undefined or non-object inputs safely', () => {
    expect(migrateDatabase(null)).toEqual(createEmptyDatabase());
    expect(migrateDatabase(undefined)).toEqual(createEmptyDatabase());
    expect(migrateDatabase('invalid-string')).toEqual(createEmptyDatabase());
    expect(migrateDatabase(123)).toEqual(createEmptyDatabase());
  });

  it('migrates legacy v0 schema to v4 preserving all data and generating pinCode & accessCode', () => {
    const legacyData = {
      classes: [{ id: 'cls-6a', name: '6-А' }],
      students: [{ id: 'std-1', classId: 'cls-6a', name: 'Артем' }],
      lessons: [{ id: 'les-1', classId: 'cls-6a', date: '2026-09-21', lessonNumber: 1 }],
      records: {
        'std-1': {
          'les-1': {
            scores: { behavior: 11, condition: 10 },
            notes: 'Активний на уроці',
          },
        },
      },
    };

    const migrated = migrateDatabase(legacyData);

    expect(migrated.version).toBe(4);
    expect(migrated.classes).toEqual(legacyData.classes);
    expect(migrated.students[0].name).toBe('Артем');
    expect(migrated.students[0].gender).toBe('male');
    expect(migrated.students[0].pinCode).toBeDefined();
    expect(migrated.students[0].pinCode?.length).toBe(4);
    expect(migrated.students[0].accessCode).toBeDefined();
    expect(migrated.students[0].accessCode?.length).toBe(6);
    expect(migrated.lessons).toEqual(legacyData.lessons);
    expect(migrated.records).toEqual(legacyData.records);
    expect(migrated.savedReports).toEqual({});
    expect(migrated.lessonFeedback).toEqual({});
    expect(migrated.attentionTasks).toEqual([]);
    expect(migrated.kpTransactions).toEqual([]);
    expect(migrated.criteria).toEqual(DEFAULT_CRITERIA);
  });

  it('preserves existing custom criteria during migration', () => {
    const customCriteria = [
      { id: 'custom-1', name: 'Каліграфія' },
    ];
    const dataWithCustomCriteria = {
      classes: [],
      students: [],
      lessons: [],
      records: {},
      criteria: customCriteria,
    };

    const migrated = migrateDatabase(dataWithCustomCriteria);
    expect(migrated.criteria).toEqual(customCriteria);
    expect(migrated.version).toBe(4);
  });

  it('migrates v2 schema to v4 adding lessonFeedback, pinCode, accessCode, attentionTasks and kpTransactions', () => {
    const v2Data = {
      version: 2,
      classes: [{ id: 'cls-7a', name: '7-А' }],
      students: [
        { id: 'std-2', classId: 'cls-7a', name: 'Олена', gender: 'female' as const },
        { id: 'std-3', classId: 'cls-7a', name: 'Тарас', gender: 'male' as const, pinCode: '5555' },
      ],
      criteria: DEFAULT_CRITERIA,
      lessons: [],
      records: {},
      savedReports: {},
    };

    const result = migrateDatabase(v2Data);
    expect(result.version).toBe(4);
    expect(result.students[0].pinCode?.length).toBe(4);
    expect(result.students[1].pinCode).toBe('5555');
    expect(result.students[0].accessCode?.length).toBe(6);
    expect(result.students[1].accessCode?.length).toBe(6);
    expect(result.lessonFeedback).toEqual({});
    expect(result.attentionTasks).toEqual([]);
    expect(result.kpTransactions).toEqual([]);
  });
});
