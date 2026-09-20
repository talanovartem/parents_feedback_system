export interface ClassItem {
  id: string;
  name: string; // наприклад, "6-А", "6-Б"
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  notes?: string; // загальна примітка про учня/особливості
}

export interface Criterion {
  id: string;
  name: string; // наприклад, "Поведінка", "Стан дитини", "Працездатність", "Активність", "Покращення", "Оцінка за урок"
  description?: string;
}

export interface Lesson {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  lessonNumber: number; // номер уроку в розкладі або номер уроку за тиждень (1..4)
  time?: string; // наприклад, "14:20 - 14:55"
  topic?: string;
}

export interface LessonStudentEntry {
  absent?: boolean; // учень відсутній ("Н")
  scores: Record<string, number>; // criterionId -> бал (0-12)
  notes?: string; // примітки саме до цього уроку ("забув зошит", "хворіє")
}

export interface DatabaseSchema {
  classes: ClassItem[];
  students: Student[];
  criteria: Criterion[];
  lessons: Lesson[];
  records: Record<string, Record<string, LessonStudentEntry>>; // studentId -> lessonId -> LessonStudentEntry
}

export interface StudentAnalytics {
  student: Student;
  totalLessons: number;
  attendedLessonsCount: number;
  absentLessonsCount: number;
  averageScores: Record<string, number>;
  totalAverage: number;
  lessonNotes: Array<{ lesson: Lesson; notes: string; scores: Record<string, number>; absent?: boolean }>;
}
