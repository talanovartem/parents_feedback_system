import { Criterion, DatabaseSchema, Lesson, Student, StudentLessonFeedback } from '../../types/feedback';

/** Спільний контракт картки уроку (використовує LessonTableCard та його підкомпоненти). */
export interface LessonTableCardProps {
  lesson: Lesson;
  classNameTitle?: string;
  isLatest: boolean;
  isNearest?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  viewMode?: 'table' | 'cards';
  onChangeViewMode?: (mode: 'table' | 'cards') => void;
  students: Student[];
  criteria: Criterion[];
  db: DatabaseSchema;
  onUpdateScore: (studentId: string, lessonId: string, criterionId: string, score: number | null) => void;
  onToggleAbsent: (studentId: string, lessonId: string) => void;
  onUpdateLessonNotes: (studentId: string, lessonId: string, notes: string) => void;
  onUpdateStudentNotes: (studentId: string, notes: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateLesson: (updated: Lesson) => void;
  onBulkFillLessonScore?: (lessonId: string, criterionId: string, score: number | null) => void;
  onMarkAllPresent?: (lessonId: string) => void;
  onOpenStudentReport: (student: Student) => void;
  onOpenAddCriterion: () => void;
  onDeleteCriterion: (criterionId: string) => void;
  onCopyLessonResults?: (
    sourceLessonId: string,
    targetLessonId: string,
    options: { copyScores: boolean; copyAttendance: boolean; copyNotes: boolean }
  ) => void;
}

/** Похідні значення, спільні для шапки та подань уроку. */
export interface LessonViewExtras {
  actualExpanded: boolean;
  currentViewMode: 'table' | 'cards';
  presentCount: number;
  absentCount: number;
}

export type { StudentLessonFeedback };
