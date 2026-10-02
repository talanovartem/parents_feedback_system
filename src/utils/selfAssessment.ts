import { Criterion, DatabaseSchema, Lesson, Student, StudentLessonFeedback } from '../types/feedback';

export interface AssessmentRow {
  student: Student;
  feedback?: StudentLessonFeedback;
  teacherScore?: number;
  teacherLevel?: number;
  needsAttention: boolean;
  absent: boolean;
}

/** Самооцінка описує розуміння теми; порівняння з підсумковим балом є лише сигналом для розмови. */
export function getAssessmentRows(
  lesson: Lesson,
  students: Student[],
  criteria: Criterion[],
  db: DatabaseSchema,
  feedback: StudentLessonFeedback[]
): AssessmentRow[] {
  const lessonGrade = criteria.find((criterion) => criterion.name.trim().toLocaleLowerCase('uk-UA') === 'оцінка за урок');
  const byStudent = new Map(feedback.map((item) => [item.studentId, item]));
  return students.map((student) => {
    const record = db.records[student.id]?.[lesson.id];
    const teacherScore = lessonGrade ? record?.scores?.[lessonGrade.id] : undefined;
    const teacherLevel = typeof teacherScore === 'number' && Number.isFinite(teacherScore)
      ? Math.max(1, Math.min(4, Math.ceil(teacherScore / 3)))
      : undefined;
    const ownFeedback = byStudent.get(student.id);
    return {
      student,
      feedback: ownFeedback,
      teacherScore,
      teacherLevel,
      needsAttention: !!ownFeedback && teacherLevel !== undefined && Math.abs(ownFeedback.selfGrade - teacherLevel) >= 2,
      absent: !!record?.absent,
    };
  });
}
