import { DatabaseSchema } from '../types/feedback';

/** Одне оновлення бази для всієї колонки, без зміни відсутніх та вже оцінених у режимі onlyEmpty. */
export function fillLessonScores(db: DatabaseSchema, lessonId: string, criterionId: string, score: number | null, onlyEmpty = false): DatabaseSchema {
  const lesson = db.lessons.find((item) => item.id === lessonId);
  if (!lesson) return db;
  const records = { ...db.records };
  let changed = false;
  for (const student of db.students.filter((item) => item.classId === lesson.classId)) {
    const existing = records[student.id]?.[lessonId];
    if (existing?.absent) continue;
    const current = existing?.scores?.[criterionId];
    if ((onlyEmpty && current !== undefined) || current === score || (score === null && current === undefined)) continue;
    const studentRecords = { ...(records[student.id] || {}) };
    const scores = { ...(existing?.scores || {}) };
    if (score === null) delete scores[criterionId];
    else scores[criterionId] = score;
    studentRecords[lessonId] = { ...(existing || {}), scores };
    records[student.id] = studentRecords;
    changed = true;
  }
  return changed ? { ...db, records } : db;
}
