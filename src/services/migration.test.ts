import { describe, it, expect } from 'vitest';
import { migrateDatabase, createEmptyDatabase, CURRENT_SCHEMA_VERSION, DEFAULT_CRITERIA } from './migration';

describe('migration service', () => {
  it('creates an empty database with CURRENT_SCHEMA_VERSION and default criteria', () => {
    const db = createEmptyDatabase();
    expect(db.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.classes).toEqual([]);
    expect(db.students).toEqual([]);
    expect(db.lessons).toEqual([]);
    expect(db.records).toEqual({});
    expect(db.criteria).toEqual(DEFAULT_CRITERIA);
  });

  it('handles null, undefined or non-object inputs safely', () => {
    expect(migrateDatabase(null)).toEqual(createEmptyDatabase());
    expect(migrateDatabase(undefined)).toEqual(createEmptyDatabase());
    expect(migrateDatabase('invalid-string')).toEqual(createEmptyDatabase());
    expect(migrateDatabase(123)).toEqual(createEmptyDatabase());
  });

  it('migrates legacy v0 schema (missing version field) to v1 preserving all data', () => {
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
      // criteria omitted
    };

    const migrated = migrateDatabase(legacyData);

    expect(migrated.version).toBe(1);
    expect(migrated.classes).toEqual(legacyData.classes);
    expect(migrated.students).toEqual(legacyData.students);
    expect(migrated.lessons).toEqual(legacyData.lessons);
    expect(migrated.records).toEqual(legacyData.records);
    // default criteria should be populated since none were provided
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
    expect(migrated.version).toBe(1);
  });

  it('keeps already migrated v1 schema intact', () => {
    const v1Data = {
      version: 1,
      classes: [{ id: 'cls-7a', name: '7-А' }],
      students: [{ id: 'std-2', classId: 'cls-7a', name: 'Олена' }],
      criteria: DEFAULT_CRITERIA,
      lessons: [],
      records: {},
    };

    const result = migrateDatabase(v1Data);
    expect(result.version).toBe(1);
    expect(result.students[0].name).toBe('Олена');
  });
});
