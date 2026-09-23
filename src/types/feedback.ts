export interface ClassItem {
  id: string;
  name: string; // наприклад, "6-А", "6-Б"
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  notes?: string; // загальна примітка про учня/особливості
  gender?: 'male' | 'female'; // стать учня (для аналітики дашборду)
  pinCode?: string; // 4-значний PIN-код для входу учня у форму фідбеку
  karpatyPoints?: number; // накопичувальні бонуси «карпатики» 🏔️
  accessCode?: string; // 6-значний код доступу для учнівського порталу
}

export type FeedbackMood = 'tired' | 'bored' | 'normal' | 'interesting' | 'excited';

export interface StudentLessonFeedback {
  id: string; // "${studentId}:${lessonId}"
  studentId: string;
  lessonId: string;
  mood: FeedbackMood;
  selfGrade: number; // 1..4 (НУШ: потребую допомоги, майже все зрозумів, впевнено, можу навчити)
  insight: string; // головне відкриття / чому навчився
  difficulty?: string; // труднощі (опціонально)
  bonusGranted: boolean; // чи зараховано бонус за якість відповіді
  karpatyPointsEarned?: number; // кількість нарахованих «карпатиків» 🏔️
  createdAt: string; // ISO дата створення
}

export interface SavedReport {
  id: string; // "${studentId}:${period}"
  studentId: string;
  period: string; // назва періоду, наприклад "Тиждень (15.09 - 21.09)"
  content: string; // текст збереженого/відредагованого звіту
  updatedAt: string; // ISO дата останнього оновлення
  sentAt?: string; // ISO дата відправки батькам (якщо надіслано)
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

// Важливе завдання / борг учня (потребує уваги)
export interface AttentionTask {
  id: string; // "task-${Date.now()}-${random}"
  studentId: string;
  classId: string;
  lessonId?: string; // якщо прив'язано до конкретного уроку
  date: string; // YYYY-MM-DD (дата фіксації або дедлайну)
  text: string; // наприклад, "Не здав контрольну роботу"
  isCompleted: boolean; // false = активне, true = закрито
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

// Транзакція внутрішньої валюти KP (Карпатики 🏔️)
export interface KpTransaction {
  id: string; // "kp-${Date.now()}"
  studentId: string;
  amount: number; // +10, +15, -5, тощо
  reason: string; // "Підсумки тижня (15.09 - 21.09)", "Бонус за ідеальне відвідування"
  weekPeriod?: string; // наприклад "2026-W38"
  createdAt: string; // ISO
}

export interface DatabaseSchema {
  version?: number; // Версія структури даних (для автоматичної міграції)
  classes: ClassItem[];
  students: Student[];
  criteria: Criterion[];
  lessons: Lesson[];
  records: Record<string, Record<string, LessonStudentEntry>>; // studentId -> lessonId -> LessonStudentEntry
  sentReports?: Record<string, string>; // "${studentId}:${period}" -> дата/час ISO відправки звіту батькам
  savedReports?: Record<string, SavedReport>; // "${studentId}:${period}" -> збережений звіт
  lessonFeedback?: Record<string, StudentLessonFeedback>; // "${studentId}:${lessonId}" -> фідбек учня
  attentionTasks?: AttentionTask[]; // Важливі завдання / борги учнів
  kpTransactions?: KpTransaction[]; // Транзакції внутрішньої валюти KP
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
