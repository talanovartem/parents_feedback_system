import { DatabaseSchema } from '../types/feedback';

export interface CopyLessonOptions {
  copyScores: boolean;
  copyAttendance: boolean;
  copyNotes: boolean;
}

/**
 * Копіює результати уроку (оцінки / «Н» / примітки) в інший урок того ж класу.
 * Семантика «дзеркала»: для скопійованих полів цільовий запис стає таким самим,
 * як джерело (включно з відсутністю запису) — учні без запису в джерелі очищуються,
 * як і попереджає модальне вікно. Захист: уроки різних класів не копіюються.
 */
export function applyCopyLessonResults(
  db: DatabaseSchema,
  sourceLessonId: string,
  targetLessonId: string,
  options: CopyLessonOptions
): DatabaseSchema {
  const sourceLesson = db.lessons.find((l) => l.id === sourceLessonId);
  const targetLesson = db.lessons.find((l) => l.id === targetLessonId);
  if (!sourceLesson || !targetLesson || sourceLesson.classId !== targetLesson.classId) {
    return db;
  }

  const records = { ...db.records };
  const classStudents = db.students.filter((s) => s.classId === sourceLesson.classId);

  for (const student of classStudents) {
    const studentRec = { ...(records[student.id] || {}) };
    const sourceEntry = studentRec[sourceLessonId];
    const oldTarget = studentRec[targetLessonId];

    const targetEntry: { scores: Record<string, number>; absent?: boolean; notes?: string } = {
      scores: oldTarget?.scores ? { ...oldTarget.scores } : {},
    };

    if (options.copyScores) {
      targetEntry.scores = { ...(sourceEntry?.scores || {}) };
    }
    if (options.copyAttendance) {
      if (sourceEntry && typeof sourceEntry.absent === 'boolean') {
        targetEntry.absent = sourceEntry.absent;
      }
    } else if (oldTarget && typeof oldTarget.absent === 'boolean') {
      targetEntry.absent = oldTarget.absent;
    }

    if (options.copyNotes) {
      if (sourceEntry?.notes !== undefined) {
        targetEntry.notes = sourceEntry.notes;
      }
    } else if (oldTarget?.notes !== undefined) {
      targetEntry.notes = oldTarget.notes;
    }

    studentRec[targetLessonId] = targetEntry;
    records[student.id] = studentRec;
  }

  return { ...db, records };
}
