import { Criterion, DatabaseSchema } from '../types/feedback';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'behavior', name: 'Поведінка' },
  { id: 'condition', name: 'Стан дитини' },
  { id: 'efficiency', name: 'Працездатність' },
  { id: 'activity', name: 'Активність' },
  { id: 'progress', name: 'Покращення' },
  { id: 'grade', name: 'Оцінка за урок' },
];

/**
 * Створює нову порожню базу даних актуальної версії.
 */
export function createEmptyDatabase(): DatabaseSchema {
  return {
    version: CURRENT_SCHEMA_VERSION,
    classes: [],
    students: [],
    criteria: [...DEFAULT_CRITERIA],
    lessons: [],
    records: {},
    sentReports: {},
  };
}

/**
 * Автоматично перевіряє та мігрує структуру даних до актуальної версії CURRENT_SCHEMA_VERSION.
 * Зберігає 100% наявних даних (класи, учнів, оцінки, уроки по тижнях).
 */
export function migrateDatabase(raw: unknown): DatabaseSchema {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDatabase();
  }

  const obj = raw as Record<string, any>;
  let version = typeof obj.version === 'number' ? obj.version : 0;

  // Міграція v0 -> v1 (початкова типізація та захист структури)
  if (version < 1) {
    const classes = Array.isArray(obj.classes) ? obj.classes : [];
    const students = Array.isArray(obj.students) ? obj.students : [];
    const lessons = Array.isArray(obj.lessons) ? obj.lessons : [];
    const criteria = Array.isArray(obj.criteria) && obj.criteria.length > 0
      ? obj.criteria
      : [...DEFAULT_CRITERIA];
    const records = (obj.records && typeof obj.records === 'object') ? obj.records : {};
    const sentReports = (obj.sentReports && typeof obj.sentReports === 'object') ? obj.sentReports : {};

    obj.version = 1;
    obj.classes = classes;
    obj.students = students;
    obj.criteria = criteria;
    obj.lessons = lessons;
    obj.records = records;
    obj.sentReports = sentReports;

    version = 1;
  }

  // Сюди додаються наступні міграції при еволюції структури:
  // if (version < 2) {
  //   upgradeFromV1ToV2(obj);
  //   version = 2;
  // }

  return {
    version: CURRENT_SCHEMA_VERSION,
    classes: obj.classes,
    students: obj.students,
    criteria: obj.criteria,
    lessons: obj.lessons,
    records: obj.records,
    sentReports: (obj.sentReports && typeof obj.sentReports === 'object') ? obj.sentReports : {},
  };
}
