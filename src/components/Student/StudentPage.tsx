import React, { useState, useMemo } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, calculateStudentTrend, generateAiPromptForParents } from '../../utils/analytics';
import { StudentChartSwitcher } from './StudentChartSwitcher';
import { AiQuickActions } from '../Report/AiQuickActions';
import {
  ArrowLeft,
  UserCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
} from 'lucide-react';

interface StudentPageProps {
  studentId: string;
  db: DatabaseSchema;
  onBackToJournal: () => void;
  onEditStudent: (student: Student) => void;
}

export const StudentPage: React.FC<StudentPageProps> = ({
  studentId,
  db,
  onBackToJournal,
  onEditStudent,
}) => {
  const [periodText, setPeriodText] = useState('вересень 2026');

  const student = useMemo(() => {
    return db.students.find((s) => s.id === studentId);
  }, [db.students, studentId]);

  const studentClass = useMemo(() => {
    if (!student) return null;
    return db.classes.find((c) => c.id === student.classId);
  }, [db.classes, student]);

  // Знаходимо паралель
  const parallelName = useMemo(() => {
    if (!studentClass) return '';
    const match = studentClass.name.match(/^(\d+)/);
    return match ? `Паралель ${match[1]}-х класів` : '';
  }, [studentClass]);

  const classLessons = useMemo(() => {
    if (!student) return [];
    return db.lessons
      .filter((l) => l.classId === student.classId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [db.lessons, student]);

  const analytics = useMemo(() => {
    if (!student) return null;
    return calculateStudentAnalytics(student, db, classLessons);
  }, [student, db, classLessons]);

  const trendData = useMemo(() => {
    if (!student) return null;
    return calculateStudentTrend(student, db, classLessons);
  }, [student, db, classLessons]);

  const aiPrompt = useMemo(() => {
    if (!student || !analytics || !studentClass) return '';
    return generateAiPromptForParents(analytics, db.criteria, studentClass.name, periodText);
  }, [student, analytics, studentClass, db.criteria, periodText]);

  if (!student || !analytics || !trendData) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Учня не знайдено</h2>
        <p className="text-sm text-slate-500">Можливо, профіль було видалено або посилання застаріло.</p>
        <button
          type="button"
          onClick={onBackToJournal}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Повернутися до журналу
        </button>
      </div>
    );
  }

  const attendanceRate =
    trendData.totalCount > 0
      ? Math.round((trendData.attendedCount / trendData.totalCount) * 100)
      : 100;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumbs & Back Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToJournal}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>До журналу уроків</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-3.5 h-3.5" />
          <span>{parallelName}</span>
          <span>•</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {studentClass?.name || 'Клас'}
          </span>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">{student.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {studentClass?.name}
              </span>
              {parallelName && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {parallelName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Персональна сторінка успішності, мультидіаграми та ШІ-звіт для батьків
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEditStudent(student)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Редагувати профіль / контекст</span>
          </button>
        </div>
      </div>

      {/* Confidential Notes Alert */}
      {student.notes && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
          <div className="p-1 rounded bg-amber-200/60 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 text-xs font-bold">
            Контекст учня
          </div>
          <div className="flex-1 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <p className="font-semibold mb-0.5">Особливості сприйняття та рекомендації для вчителя:</p>
            <p>{student.notes}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Середній бал</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {trendData.overallAverage}
            </span>
            <span className="text-xs text-slate-400">/ 12</span>
          </div>
          <span className="text-[11px] text-slate-400">за всі уроки</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Тренд успішності</span>
          <div className="mt-1 flex items-center gap-1.5">
            {trendData.trendDirection === 'up' && (
              <>
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  +{trendData.difference}
                </span>
              </>
            )}
            {trendData.trendDirection === 'down' && (
              <>
                <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {trendData.difference}
                </span>
              </>
            )}
            {trendData.trendDirection === 'stable' && (
              <>
                <Minus className="w-5 h-5 text-slate-400" />
                <span className="text-xl font-bold text-slate-600 dark:text-slate-300">Стабільно</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {trendData.previousAverage} → {trendData.recentAverage} балів
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Відвідування</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {attendanceRate}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {trendData.attendedCount} з {trendData.totalCount} уроків
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Пропуски</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {trendData.absentCount}
            </span>
            <span className="text-xs text-slate-400">уроків</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {trendData.absentCount === 0 ? 'Без пропусків' : 'Потребують уваги'}
          </span>
        </div>
      </div>

      {/* Multi-Chart Switcher */}
      <StudentChartSwitcher student={student} db={db} />

      {/* AI Report Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Промпт для ШІ (повідомлення для батьків)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Готовий текст із поурочними спостереженнями та делікатним урахуванням контексту
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={periodText}
              onChange={(e) => setPeriodText(e.target.value)}
              placeholder="Період: вересень 2026"
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* AI Quick Actions */}
        <AiQuickActions prompt={aiPrompt} />

        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={aiPrompt}
            className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950 dark:text-slate-200 focus:outline-none leading-relaxed select-all"
          />
        </div>
      </div>

      {/* Full Lesson History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Хронологія відвідування та оцінювання ({trendData.points.length} уроків)
        </h3>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {trendData.points.map((p) => (
            <div
              key={p.lessonId}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3">
                {p.absent ? (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {p.date}
                    </span>
                    <span className="text-xs text-slate-400">Урок №{p.lessonNumber}</span>
                    {p.absent && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        Пропуск
                      </span>
                    )}
                  </div>
                  {p.topic && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">{p.topic}</div>
                  )}
                  {p.notes && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 italic">
                      Нотатка: {p.notes}
                    </div>
                  )}
                </div>
              </div>

              {!p.absent && (
                <div className="flex items-center gap-2 sm:self-center self-end">
                  <span className="text-xs text-slate-400">Середній:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                    {p.averageScore !== undefined ? `${p.averageScore} / 12` : '—'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
