import React from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { LessonTableCard } from './LessonTableCard';
import { CalendarPlus, UserPlus, Plus } from 'lucide-react';

interface JournalTableProps {
  currentClassId: string;
  db: DatabaseSchema;
  onUpdateScore: (studentId: string, lessonId: string, criterionId: string, score: number | null) => void;
  onToggleAbsent: (studentId: string, lessonId: string) => void;
  onUpdateLessonNotes: (studentId: string, lessonId: string, notes: string) => void;
  onUpdateStudentNotes: (studentId: string, notes: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onOpenAddLesson: () => void;
  onOpenAddStudent: () => void;
  onOpenStudentReport: (student: Student) => void;
  onOpenAddCriterion: () => void;
  onDeleteCriterion: (criterionId: string) => void;
}

export const JournalTable: React.FC<JournalTableProps> = ({
  currentClassId,
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onDeleteLesson,
  onOpenAddLesson,
  onOpenAddStudent,
  onOpenStudentReport,
  onOpenAddCriterion,
  onDeleteCriterion,
}) => {
  const students = db.students.filter((s) => s.classId === currentClassId);

  // Сортуємо уроки у спадному порядку: НАЙСВІЖІШИЙ ЗВЕРХУ!
  const sortedLessons = db.lessons
    .filter((l) => l.classId === currentClassId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.lessonNumber - a.lessonNumber);

  if (students.length === 0 && sortedLessons.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <CalendarPlus className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">У цьому класі ще немає уроків та учнів</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Створіть перший урок або додайте учнів, щоб почати щоденне оцінювання та облік відвідування.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onOpenAddStudent}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Додати учня
          </button>
          <button
            onClick={onOpenAddLesson}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Створити урок
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Верхня панель швидких дій над списком уроків */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Уроків у класі: <strong className="text-slate-800 font-semibold">{sortedLessons.length}</strong></span>
          <span>Учнів: <strong className="text-slate-800 font-semibold">{students.length}</strong></span>
          <span className="hidden sm:inline">Колонок оцінювання: <strong className="text-slate-800 font-semibold">{db.criteria.length}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCriterion}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            + Колонка (критерій)
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            Додати учня
          </button>
          <button
            onClick={onOpenAddLesson}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            + Новий урок
          </button>
        </div>
      </div>

      {/* Список таблиць уроків у порядку спадання */}
      {sortedLessons.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
          У цьому класі ще не створено жодного уроку. Натисніть «+ Новий урок» вище.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLessons.map((lesson, idx) => (
            <LessonTableCard
              key={lesson.id}
              lesson={lesson}
              isLatest={idx === 0}
              students={students}
              criteria={db.criteria}
              db={db}
              onUpdateScore={onUpdateScore}
              onToggleAbsent={onToggleAbsent}
              onUpdateLessonNotes={onUpdateLessonNotes}
              onUpdateStudentNotes={onUpdateStudentNotes}
              onDeleteLesson={onDeleteLesson}
              onOpenStudentReport={onOpenStudentReport}
              onOpenAddCriterion={onOpenAddCriterion}
              onDeleteCriterion={onDeleteCriterion}
            />
          ))}
        </div>
      )}
    </div>
  );
};
