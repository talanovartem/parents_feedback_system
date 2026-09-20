import { Criterion, DatabaseSchema, Student } from '../types/feedback';

export const CURRENT_SCHEMA_VERSION = 2;

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'behavior', name: 'Поведінка' },
  { id: 'condition', name: 'Стан дитини' },
  { id: 'efficiency', name: 'Працездатність' },
  { id: 'activity', name: 'Активність' },
  { id: 'progress', name: 'Покращення' },
  { id: 'grade', name: 'Оцінка за урок' },
];

/**
 * Автоматичне визначення статі учня за закінченням імені (українські традиції).
 * Повертає 'female' для жіночих закінчень, 'male' для решти.
 */
export function guessGender(name: string): 'male' | 'female' {
  const firstName = name.trim().split(/\s+/)[1] || name.trim().split(/\s+/)[0] || '';
  const lc = firstName.toLowerCase();
  // Жіночі закінчення в українських іменах
  const femaleEndings = ['а', 'я', 'ія', 'на', 'іна', 'ина', 'ка', 'ля', 'ра', 'са'];
  for (const ending of femaleEndings) {
    if (lc.endsWith(ending)) return 'female';
  }
  return 'male';
}

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
    savedReports: {},
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

  // Міграція v1 -> v2 (savedReports + автовизначення статі для наявних учнів)
  if (version < 2) {
    obj.savedReports = (obj.savedReports && typeof obj.savedReports === 'object')
      ? obj.savedReports
      : {};

    // Автоматичне визначення статі для існуючих учнів без поля gender
    if (Array.isArray(obj.students)) {
      obj.students = obj.students.map((s: Student) => ({
        ...s,
        gender: s.gender ?? guessGender(s.name),
      }));
    }

    obj.version = 2;
    version = 2;
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    classes: obj.classes,
    students: obj.students,
    criteria: obj.criteria,
    lessons: obj.lessons,
    records: obj.records,
    sentReports: (obj.sentReports && typeof obj.sentReports === 'object') ? obj.sentReports : {},
    savedReports: (obj.savedReports && typeof obj.savedReports === 'object') ? obj.savedReports : {},
  };
}
