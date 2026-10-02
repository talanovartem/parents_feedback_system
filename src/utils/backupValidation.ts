import { DatabaseSchema } from '../types/feedback';
import { migrateDatabase } from '../services/migration';

export function validateBackup(raw: unknown): DatabaseSchema {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Файл не містить базу даних');
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.classes) || !Array.isArray(data.students) || !Array.isArray(data.lessons) || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) {
    throw new Error('У файлі бракує класів, учнів, уроків або записів');
  }
  const db = migrateDatabase(raw);
  const classIds = new Set<string>();
  const studentIds = new Set<string>();
  const lessonIds = new Set<string>();
  for (const item of db.classes) {
    if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || classIds.has(item.id)) throw new Error('У файлі є некоректні або повторні класи');
    classIds.add(item.id);
  }
  for (const item of db.students) {
    if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !classIds.has(item.classId) || studentIds.has(item.id)) throw new Error('У файлі є некоректні учні або невідомий клас');
    studentIds.add(item.id);
  }
  for (const item of db.lessons) {
    if (!item || typeof item.id !== 'string' || !item.id || !classIds.has(item.classId) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isInteger(item.lessonNumber) || lessonIds.has(item.id)) throw new Error('У файлі є некоректні або повторні уроки');
    lessonIds.add(item.id);
  }
  if (!Array.isArray(db.criteria) || (db.kpTransactions !== undefined && !Array.isArray(db.kpTransactions)) || (db.attentionTasks !== undefined && !Array.isArray(db.attentionTasks))) throw new Error('У файлі пошкоджені додаткові дані');
  return db;
}

export function backupSummary(db: DatabaseSchema) {
  return {
    classes: db.classes.length,
    students: db.students.length,
    lessons: db.lessons.length,
    reports: Object.keys(db.savedReports || {}).length,
    kp: (db.kpTransactions || []).length,
  };
}
