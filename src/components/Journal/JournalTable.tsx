import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseSchema, Lesson, Student } from '../../types/feedback';
import { LessonTableCard } from './LessonTableCard';
import { CalendarPlus, UserPlus, Plus, Layers, ExternalLink, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { getSchoolTodayUrl } from '../../utils/lessonParser';
import { findNearestLessonId } from '../../utils/lessonTime';

interface JournalTableProps {
  currentClassId: string;
  db: DatabaseSchema;
  onUpdateScore: (studentId: string, lessonId: string, criterionId: string, score: number | null) => void;
  onToggleAbsent: (studentId: string, lessonId: string) => void;
  onUpdateLessonNotes: (studentId: string, lessonId: string, notes: string) => void;
  onUpdateStudentNotes: (studentId: string, notes: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateLesson: (updated: Lesson) => void;
  onBulkFillLessonScore?: (lessonId: string, criterionId: string, score: number | null) => void;
  onMarkAllPresent?: (lessonId: string) => void;
  onOpenAddLesson: () => void;
  onOpenBulkAddLesson: () => void;
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
  onUpdateLesson,
  onBulkFillLessonScore,
  onMarkAllPresent,
  onOpenAddLesson,
  onOpenBulkAddLesson,
  onOpenAddStudent,
  onOpenStudentReport,
  onOpenAddCriterion,
  onDeleteCriterion,
}) => {
  const students = db.students.filter((s) => s.classId === currentClassId);

  const classLessons = useMemo(
    () => db.lessons.filter((l) => l.classId === currentClassId),
    [db.lessons, currentClassId]
  );

  // Знаходимо найближчий за датою та часом урок
  const nearestLessonId = useMemo(
    () => findNearestLessonId(classLessons),
    [classLessons]
  );

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedLessons = useMemo(() => {
    return [...classLessons].sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.date.localeCompare(a.date) || (b.lessonNumber || 0) - (a.lessonNumber || 0);
      }
      return a.date.localeCompare(b.date) || (a.lessonNumber || 0) - (b.lessonNumber || 0);
    });
  }, [classLessons, sortOrder]);

  // Стан розгорнутих карток
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(new Set());

  // Автоматично тримаємо активним (розгорнутим) найближчий за датою та часом урок
  useEffect(() => {
    if (nearestLessonId) {
      setExpandedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(nearestLessonId);
        return next;
      });
    }
  }, [currentClassId, nearestLessonId]);

  const handleToggleExpand = (lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedLessonIds(new Set(classLessons.map((l) => l.id)));
  };

  const handleCollapseAll = () => {
    setExpandedLessonIds(new Set());
  };

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
          <button
            onClick={onOpenBulkAddLesson}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            Масове додавання
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Верхня панель швидких дій над списком уроків */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Уроків у класі: <strong className="text-slate-800 font-semibold">{sortedLessons.length}</strong></span>
            <span>Учнів: <strong className="text-slate-800 font-semibold">{students.length}</strong></span>
            <span className="hidden sm:inline">Колонок: <strong className="text-slate-800 font-semibold">{db.criteria.length}</strong></span>
          </div>

          {sortedLessons.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <button
                type="button"
                onClick={expandedLessonIds.size === sortedLessons.length ? handleCollapseAll : handleExpandAll}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1"
                title={expandedLessonIds.size === sortedLessons.length ? 'Згорнути всі картки уроків' : 'Розгорнути всі картки уроків'}
              >
                {expandedLessonIds.size === sortedLessons.length ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Згорнути всі</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Розгорнути всі</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1"
                title="Змінити напрямок сортування уроків за датою"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{sortOrder === 'desc' ? 'Свіжі зверху' : 'Хронологічно'}</span>
              </button>
            </div>
          )}
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
          {/* Кнопки переходу до School Today */}
          <div className="flex items-center rounded-lg border border-blue-200 bg-blue-50/70 p-0.5 shadow-2xs">
            <span className="px-2 py-0.5 text-[11px] font-bold text-blue-800 flex items-center gap-1">
              <ExternalLink className="w-3 h-3 text-blue-600" />
              School Today:
            </span>
            <a
              href={getSchoolTodayUrl(0).url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Поточний тиждень (${getSchoolTodayUrl(0).startDateStr} – ${getSchoolTodayUrl(0).endDateStr})`}
              className="px-2 py-0.5 text-xs font-semibold text-blue-700 hover:text-blue-950 hover:bg-blue-100 rounded transition-colors"
            >
              Цей тиждень
            </a>
            <span className="text-blue-300">|</span>
            <a
              href={getSchoolTodayUrl(1).url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Наступний тиждень (${getSchoolTodayUrl(1).startDateStr} – ${getSchoolTodayUrl(1).endDateStr})`}
              className="px-2 py-0.5 text-xs font-bold text-blue-800 hover:text-blue-950 hover:bg-blue-100 rounded transition-colors"
            >
              Наступний тиждень
            </a>
          </div>
          <button
            onClick={onOpenBulkAddLesson}
            title="Масове створення уроків за описом або файлом"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Масове додавання
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
              isNearest={lesson.id === nearestLessonId}
              isExpanded={expandedLessonIds.has(lesson.id)}
              onToggleExpand={() => handleToggleExpand(lesson.id)}
              students={students}
              criteria={db.criteria}
              db={db}
              onUpdateScore={onUpdateScore}
              onToggleAbsent={onToggleAbsent}
              onUpdateLessonNotes={onUpdateLessonNotes}
              onUpdateStudentNotes={onUpdateStudentNotes}
              onDeleteLesson={onDeleteLesson}
              onUpdateLesson={onUpdateLesson}
              onBulkFillLessonScore={onBulkFillLessonScore}
              onMarkAllPresent={onMarkAllPresent}
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
