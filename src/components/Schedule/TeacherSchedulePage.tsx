import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseSchema, Lesson, Student } from '../../types/feedback';
import { LessonTableCard } from '../Journal/LessonTableCard';
import { findNearestLessonId } from '../../utils/lessonTime';
import { getLessonCompletion } from '../../utils/lessonCompletion';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { getSchoolTodayUrl } from '../../utils/lessonParser';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  CalendarPlus,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface TeacherSchedulePageProps {
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
  onOpenAddLesson: () => void;
  onOpenBulkAddLesson: () => void;
  onNavigateToClassJournal: (classId: string) => void;
  onCopyLessonResults?: (
    sourceLessonId: string,
    targetLessonId: string,
    options: { copyScores: boolean; copyAttendance: boolean; copyNotes: boolean }
  ) => void;
}

export const TeacherSchedulePage: React.FC<TeacherSchedulePageProps> = ({
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onDeleteLesson,
  onUpdateLesson,
  onBulkFillLessonScore,
  onMarkAllPresent,
  onOpenStudentReport,
  onOpenAddCriterion,
  onDeleteCriterion,
  onOpenAddLesson,
  onOpenBulkAddLesson,
  onNavigateToClassJournal,
  onCopyLessonResults,
}) => {
  const periodPresets = getPeriodPresets();
  const currentWeekPreset = periodPresets.find((p) => p.id === 'current-week') || periodPresets[0];

  // Вибір тижня (за замовчуванням: поточний тиждень)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('current-week');

  // Фільтр за класом ('all' або classId)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Фільтр за статусом ('all' або 'unfilled')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unfilled'>('all');

  // Визначення дат вибраного періоду
  const activePreset = periodPresets.find((p) => p.id === selectedPeriodId);
  const startDate = activePreset?.startDate;
  const endDate = activePreset?.endDate;

  // Фільтрація уроків за періодом
  const periodLessons = useMemo(() => {
    if (!startDate || !endDate) {
      return [...db.lessons];
    }
    return filterLessonsByDateRange(db.lessons, startDate, endDate);
  }, [db.lessons, startDate, endDate]);

  // Фільтрація за класом
  const classFilteredLessons = useMemo(() => {
    if (selectedClassFilter === 'all') return periodLessons;
    return periodLessons.filter((l) => l.classId === selectedClassFilter);
  }, [periodLessons, selectedClassFilter]);

  // Фільтрація за статусом заповненості
  const finalFilteredLessons = useMemo(() => {
    if (statusFilter === 'all') return classFilteredLessons;
    return classFilteredLessons.filter((l) => {
      const classStudents = db.students.filter((s) => s.classId === l.classId);
      const completion = getLessonCompletion(l, classStudents, db.records);
      return !completion.isFullyGraded;
    });
  }, [classFilteredLessons, statusFilter, db.students, db.records]);

  // Знаходження найближчого уроку серед усіх у розкладі
  const nearestLessonId = useMemo(() => {
    return findNearestLessonId(db.lessons);
  }, [db.lessons]);

  // Стан розкриття карток уроків
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(new Set());

  // Автоматично тримаємо відкритим найближчий урок при старті
  useEffect(() => {
    if (nearestLessonId) {
      setExpandedLessonIds((prev) => {
        const next = new Set(prev);
        next.add(nearestLessonId);
        return next;
      });
    }
  }, [nearestLessonId]);

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
    setExpandedLessonIds(new Set(finalFilteredLessons.map((l) => l.id)));
  };

  const handleCollapseAll = () => {
    setExpandedLessonIds(new Set());
  };

  // Розрахунок статистики за вибраний період
  const stats = useMemo(() => {
    let fullyGraded = 0;
    let partiallyGraded = 0;
    let notGraded = 0;

    for (const l of classFilteredLessons) {
      const classStudents = db.students.filter((s) => s.classId === l.classId);
      const completion = getLessonCompletion(l, classStudents, db.records);
      if (completion.isFullyGraded) fullyGraded++;
      else if (completion.isPartiallyGraded) partiallyGraded++;
      else notGraded++;
    }

    return {
      total: classFilteredLessons.length,
      fullyGraded,
      partiallyGraded,
      notGraded,
      pendingTotal: partiallyGraded + notGraded,
    };
  }, [classFilteredLessons, db.students, db.records]);

  // Групування уроків за датами (від ранніх до пізніх)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Lesson[]> = {};

    for (const l of finalFilteredLessons) {
      if (!groups[l.date]) {
        groups[l.date] = [];
      }
      groups[l.date].push(l);
    }

    // Сортуємо самі дати за зростанням (понеділок -> п'ятниця)
    const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    // Якщо поточний день є серед уроків — виносимо його на перше місце списку
    const today = new Date().toISOString().slice(0, 10);
    const orderedDates = sortedDates.includes(today)
      ? [today, ...sortedDates.filter((d) => d !== today)]
      : sortedDates;

    // Всередині кожного дня сортуємо уроки хронологічно за часом / номером
    const result: { date: string; lessons: Lesson[] }[] = [];
    for (const d of orderedDates) {
      const sortedDayLessons = groups[d].sort((a, b) => {
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return (a.lessonNumber || 1) - (b.lessonNumber || 1);
      });
      result.push({ date: d, lessons: sortedDayLessons });
    }

    return result;
  }, [finalFilteredLessons]);

  const todayIso = new Date().toISOString().slice(0, 10);

  // Форматування дати українською (наприклад, "Понеділок, 21 вересня")
  const formatDayHeading = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const weekday = dateObj.toLocaleDateString('uk-UA', { weekday: 'long' });
      const monthName = dateObj.toLocaleDateString('uk-UA', { month: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return {
        weekday: capitalizedWeekday,
        full: `${capitalizedWeekday}, ${day} ${monthName}`,
        isToday: dateStr === todayIso,
      };
    } catch {
      return { weekday: dateStr, full: dateStr, isToday: dateStr === todayIso };
    }
  };

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto animate-in fade-in duration-200">
      {/* Верхня панель розкладу: вибір тижня, фільтри та статистика */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Заголовок щоденника */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Розклад уроків та щоденник оцінювання
              </h2>
              <p className="text-xs text-slate-500">
                Скрізний розклад занять по всіх класах з контролем заповненості журналу
              </p>
            </div>
          </div>

          {/* Швидкі дії */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Швидкий перехід у School Today */}
            <div className="flex items-center rounded-xl border border-blue-200 bg-blue-50/70 p-1 shadow-2xs">
              <span className="px-2 py-0.5 text-xs font-bold text-blue-800 flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">School Today:</span>
              </span>
              <a
                href={getSchoolTodayUrl(0).url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Поточний тиждень (${getSchoolTodayUrl(0).startDateStr} – ${getSchoolTodayUrl(0).endDateStr})`}
                className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-950 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Цей тиждень
              </a>
              <span className="text-blue-300">|</span>
              <a
                href={getSchoolTodayUrl(1).url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Наступний тиждень (${getSchoolTodayUrl(1).startDateStr} – ${getSchoolTodayUrl(1).endDateStr})`}
                className="px-2.5 py-1 text-xs font-bold text-blue-800 hover:text-blue-950 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Наступний
              </a>
            </div>

            <button
              onClick={onOpenBulkAddLesson}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Масове додавання</span>
              <span className="sm:hidden">Масово</span>
            </button>

            <button
              onClick={onOpenAddLesson}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Новий урок</span>
            </button>
          </div>
        </div>

        {/* Панель фільтрів: Тиждень / Клас / Статус заповнення */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Вибір періоду (тижня) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setSelectedPeriodId('current-week')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  selectedPeriodId === 'current-week'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Поточний тиждень<span className="hidden md:inline"> ({currentWeekPreset.description})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPeriodId('next-week')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedPeriodId === 'next-week'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Наступний тиждень
              </button>

              <button
                type="button"
                onClick={() => setSelectedPeriodId('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedPeriodId === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Всі уроки
              </button>
            </div>

            {/* Фільтр за класом */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Усі класи ({db.classes.length})</option>
                {db.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Клас {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Фільтр заповненості */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Всі ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unfilled')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  statusFilter === 'unfilled'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'text-amber-800 hover:text-amber-900'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Незаповнені ({stats.pendingTotal})</span>
              </button>
            </div>
          </div>

          {/* Лічильники та кнопки розгортання */}
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden lg:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Заповнено: {stats.fullyGraded}</span>
              </span>
              {stats.pendingTotal > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-amber-800 bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Потребують оцінок: {stats.pendingTotal}</span>
                </span>
              )}
            </div>

            {finalFilteredLessons.length > 0 && (
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <button
                  type="button"
                  onClick={expandedLessonIds.size === finalFilteredLessons.length ? handleCollapseAll : handleExpandAll}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1"
                >
                  {expandedLessonIds.size === finalFilteredLessons.length ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Згорнути всі</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Розгорнути всі</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Список днів та уроків */}
      {groupedByDate.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3 max-w-lg mx-auto mt-6">
          <Calendar className="w-10 h-10 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            {statusFilter === 'unfilled'
              ? 'Усі уроки за вибраними критеріями вже заповнено! 🎉'
              : 'У розкладі на вибраний період ще немає уроків'}
          </h3>
          <p className="text-xs text-slate-500">
            {statusFilter === 'unfilled'
              ? 'Чудова робота! Журнал актуальний та повністю заповнений.'
              : 'Додайте заняття зі School Today або створити новий урок.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {statusFilter === 'unfilled' ? (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl"
              >
                Показати всі уроки
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenBulkAddLesson}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Масове додавання
                </button>
                <button
                  onClick={onOpenAddLesson}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  Створити урок
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(({ date, lessons }) => {
            const dayInfo = formatDayHeading(date);

            return (
              <div key={date} className="space-y-3">
                {/* Заголовок дня */}
                <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>{dayInfo.full}</span>
                    </h3>

                    {dayInfo.isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white shadow-2xs">
                        Сьогодні
                      </span>
                    )}

                    <span className="text-xs font-medium text-slate-500">
                      ({lessons.length} {lessons.length === 1 ? 'урок' : lessons.length < 5 ? 'уроки' : 'уроків'})
                    </span>
                  </div>
                </div>

                {/* Картки уроків цього дня */}
                <div className="space-y-3">
                  {lessons.map((lesson) => {
                    const classItem = db.classes.find((c) => c.id === lesson.classId);
                    const classStudents = db.students.filter((s) => s.classId === lesson.classId);

                    return (
                      <div key={lesson.id} className="relative group">
                        <LessonTableCard
                          lesson={lesson}
                          classNameTitle={classItem?.name ? `Клас ${classItem.name}` : undefined}
                          isLatest={false}
                          isNearest={lesson.id === nearestLessonId}
                          isExpanded={expandedLessonIds.has(lesson.id)}
                          onToggleExpand={() => handleToggleExpand(lesson.id)}
                          students={classStudents}
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
                          onCopyLessonResults={onCopyLessonResults}
                        />

                        {/* Кнопка швидкого переходу у журнал цього класу */}
                        {classItem && (
                          <div className="absolute right-28 top-3.5 hidden group-hover:flex items-center">
                            <button
                              type="button"
                              onClick={() => onNavigateToClassJournal(classItem.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white/90 hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs flex items-center gap-1 transition-all"
                              title={`Перейти до повного журналу класу ${classItem.name}`}
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Журнал {classItem.name}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
