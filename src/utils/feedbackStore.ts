import { DatabaseSchema, Lesson, StudentLessonFeedback } from '../types/feedback';

/**
 * Застосовує фідбек учня до БД: зберігає відгук, коригує баланс KP на РІЗНИЦЮ
 * старих і нових балів (повторний сабміт не подвоює бонус) і пише транзакцію
 * в історію kpTransactions, щоб баланс завжди збігався з історією.
 */
export function applyFeedbackToDb(
  db: DatabaseSchema,
  feedback: StudentLessonFeedback
): DatabaseSchema {
  const existing = db.lessonFeedback?.[feedback.id];
  const lessonFeedback = { ...(db.lessonFeedback || {}), [feedback.id]: feedback };

  const oldPts = existing?.karpatyPointsEarned || 0;
  const newPts = feedback.karpatyPointsEarned || 0;
  const delta = existing ? newPts - oldPts : newPts;

  const students = db.students.map((s) =>
    s.id === feedback.studentId
      ? { ...s, karpatyPoints: (s.karpatyPoints || 0) + delta }
      : s
  );

  let kpTransactions = db.kpTransactions || [];
  if (delta !== 0) {
    const lesson = db.lessons.find((l: Lesson) => l.id === feedback.lessonId);
    kpTransactions = [
      ...kpTransactions,
      {
        id: `kp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        studentId: feedback.studentId,
        amount: delta,
        reason: `${existing ? 'Коригування' : 'Фідбек'} фідбеку до уроку${lesson ? ` (${lesson.date})` : ''}`,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return { ...db, lessonFeedback, students, kpTransactions };
}
