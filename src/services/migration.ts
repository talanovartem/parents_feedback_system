import { Criterion, DatabaseSchema, Student } from '../types/feedback';

export const CURRENT_SCHEMA_VERSION = 4;

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
 * Генерує детермінований 4-значний PIN-код для учня на основі його ID.
 */
export function generateStudentPin(studentId: string): string {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = ((hash << 5) - hash + studentId.charCodeAt(i)) | 0;
  }
  const code = (1000 + (Math.abs(hash) % 9000)).toString();
  return code;
}

/**
 * Генерує унікальний 6-значний цифровий код доступу для учнівського порталу.
 */
export function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    lessonFeedback: {},
    attentionTasks: [],
    kpTransactions: [],
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

  // Міграція v2 -> v3 (lessonFeedback + автоматичні 4-значні PIN-коди для учнів)
  if (version < 3) {
    obj.lessonFeedback = (obj.lessonFeedback && typeof obj.lessonFeedback === 'object')
      ? obj.lessonFeedback
      : {};

    if (Array.isArray(obj.students)) {
      obj.students = obj.students.map((s: Student) => ({
        ...s,
        pinCode: s.pinCode || generateStudentPin(s.id),
      }));
    }

    obj.version = 3;
    version = 3;
  }

  // Міграція v3 -> v4 (attentionTasks + kpTransactions + accessCode для учнів)
  if (version < 4) {
    obj.attentionTasks = Array.isArray(obj.attentionTasks) ? obj.attentionTasks : [];
    obj.kpTransactions = Array.isArray(obj.kpTransactions) ? obj.kpTransactions : [];

    if (Array.isArray(obj.students)) {
      obj.students = obj.students.map((s: Student) => ({
        ...s,
        accessCode: s.accessCode || generateAccessCode(),
      }));
    }

    obj.version = 4;
    version = 4;
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
    lessonFeedback: (obj.lessonFeedback && typeof obj.lessonFeedback === 'object') ? obj.lessonFeedback : {},
    attentionTasks: Array.isArray(obj.attentionTasks) ? obj.attentionTasks : [],
    kpTransactions: Array.isArray(obj.kpTransactions) ? obj.kpTransactions : [],
  };
}
