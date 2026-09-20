import { Lesson, Student, LessonStudentEntry } from '../types/feedback';

export interface LessonCompletionStatus {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  gradedCount: number; // присутні учні, у яких виставлено хоча б одну оцінку
  isFullyGraded: boolean;
  isPartiallyGraded: boolean;
  isNotGraded: boolean;
  percentage: number; // відсоток оцінених від присутніх (0-100)
}

/**
 * Розраховує стан заповненості оцінок для конкретного уроку
 */
export function getLessonCompletion(
  lesson: Lesson,
  classStudents: Student[],
  records: Record<string, Record<string, LessonStudentEntry>>
): LessonCompletionStatus {
  const totalStudents = classStudents.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      gradedCount: 0,
      isFullyGraded: false,
      isPartiallyGraded: false,
      isNotGraded: true,
      percentage: 0,
    };
  }

  let absentCount = 0;
  let presentCount = 0;
  let gradedCount = 0;

  for (const s of classStudents) {
    const rec = records[s.id]?.[lesson.id];
    if (rec?.absent) {
      absentCount++;
    } else {
      presentCount++;
      const scoreValues = rec?.scores
        ? Object.values(rec.scores).filter((v) => typeof v === 'number' && !isNaN(v))
        : [];
      if (scoreValues.length > 0) {
        gradedCount++;
      }
    }
  }

  const isFullyGraded = presentCount > 0 && gradedCount === presentCount;
  const isPartiallyGraded = gradedCount > 0 && gradedCount < presentCount;
  const isNotGraded = gradedCount === 0;
  const percentage = presentCount > 0 ? Math.round((gradedCount / presentCount) * 100) : 100;

  return {
    totalStudents,
    presentCount,
    absentCount,
    gradedCount,
    isFullyGraded,
    isPartiallyGraded,
    isNotGraded,
    percentage,
  };
}
