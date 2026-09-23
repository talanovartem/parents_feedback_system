import React, { useState, useMemo } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, calculateStudentTrend, generateAiPromptForParents } from '../../utils/analytics';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { StudentChartSwitcher } from './StudentChartSwitcher';
import { AiQuickActions } from '../Report/AiQuickActions';
import { PeriodSelector } from '../Report/PeriodSelector';
import {
  ArrowLeft,
  UserCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Layers,
  Trash2,
  AlertCircle,
  Mountain,
  QrCode,
  Copy,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStudentPortalHash } from '../../router/useRouter';
import { generateQrSvg } from '../../utils/qrCodeGenerator';

interface StudentPageProps {
  studentId: string;
  db: DatabaseSchema;
  onBackToJournal: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => boolean | void;
}

export const StudentPage: React.FC<StudentPageProps> = ({
  studentId,
  db,
  onBackToJournal,
  onEditStudent,
  onDeleteStudent,
}) => {
  const defaultPreset = getPeriodPresets()[0];
  const [periodText, setPeriodText] = useState(defaultPreset.description);
  const [periodStartDate, setPeriodStartDate] = useState<string | undefined>(defaultPreset.startDate);
  const [periodEndDate, setPeriodEndDate] = useState<string | undefined>(defaultPreset.endDate);
  const [showQr, setShowQr] = useState(false);

  const studentTasks = useMemo(() => {
    return (db.attentionTasks || []).filter((t) => t.studentId === studentId);
  }, [db.attentionTasks, studentId]);

  const activeTasks = useMemo(() => {
    return studentTasks.filter((t) => !t.isCompleted);
  }, [studentTasks]);

  const studentKpTransactions = useMemo(() => {
    return (db.kpTransactions || [])
      .filter((t) => t.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [db.kpTransactions, studentId]);

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

  // Уроки, що потрапляють у вибраний діапазон дат (якщо є співпадіння)
  const periodLessons = useMemo(() => {
    const matched = filterLessonsByDateRange(classLessons, periodStartDate, periodEndDate);
    return matched.length > 0 ? matched : classLessons;
  }, [classLessons, periodStartDate, periodEndDate]);

  const analytics = useMemo(() => {
    if (!student) return null;
    return calculateStudentAnalytics(student, db, periodLessons);
  }, [student, db, periodLessons]);

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
        <h2 className="text-xl font-bold text-slate-800">Учня не знайдено</h2>
        <p className="text-sm text-slate-500">Можливо, профіль було видалено або посилання застаріло.</p>
        <button
          type="button"
          onClick={onBackToJournal}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
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
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>До журналу уроків</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-3.5 h-3.5" />
          <span>{parallelName}</span>
          <span>•</span>
          <span className="font-semibold text-slate-600">
            {studentClass?.name || 'Клас'}
          </span>
        </div>
      </div>

      {/* Student Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900">{student.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                {studentClass?.name}
              </span>
              {parallelName && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {parallelName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Персональна картка учня, мультидіаграми та ШІ-звіт для батьків
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEditStudent(student)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Редагувати профіль / контекст</span>
          </button>

          {onDeleteStudent && (
            <button
              type="button"
              onClick={() => {
                const deleted = onDeleteStudent(student.id);
                if (deleted) {
                  onBackToJournal();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
              title="Видалити учня з журналу"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Видалити учня</span>
            </button>
          )}
        </div>
      </div>

      {/* Confidential Notes Alert */}
      {student.notes && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
          <div className="p-1 rounded bg-amber-200/60 text-amber-800 text-xs font-bold">
            Контекст учня
          </div>
          <div className="flex-1 text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-0.5">Особливості сприйняття та рекомендації для вчителя:</p>
            <p>{student.notes}</p>
          </div>
        </div>
      )}

      {/* Active Attention Tasks / Debts */}
      {activeTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Потребує уваги ({activeTasks.length})</span>
            </div>
            <span className="text-[11px] font-medium text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
              Активні борги / зауваження
            </span>
          </div>
          <div className="divide-y divide-rose-200/60 bg-white/70 rounded-xl p-2 border border-rose-100">
            {activeTasks.map((task) => (
              <div key={task.id} className="py-2 px-1 flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{task.text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Дата: {task.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Portal & KP Currency Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-white to-amber-50/70 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Учнівський портал та бонуси KP</h3>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">
                {student.karpatyPoints || 0} 🏔️ KP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Код доступу до кабінету: <strong className="font-mono text-slate-800 tracking-wider">{student.accessCode || '—'}</strong> · PIN для анкет: <strong className="font-mono text-slate-800">{student.pinCode || '—'}</strong>
            </p>
            {studentKpTransactions.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-0.5">
                Останнє нарахування: <strong className="font-semibold">+{studentKpTransactions[0].amount} 🏔️</strong> ({studentKpTransactions[0].reason})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}${getStudentPortalHash(student.id)}`;
              navigator.clipboard.writeText(url);
              toast.success(`Посилання на учнівський портал ${student.name} скопійовано! 🔗`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 shadow-2xs transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Скопіювати посилання</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQr ? 'Сховати QR-код' : 'Показати QR-код'}</span>
          </button>
        </div>
      </div>

      {/* QR Code Container if opened */}
      {showQr && (
        <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in duration-200">
          <div
            className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs"
            dangerouslySetInnerHTML={{
              __html: generateQrSvg(
                `${window.location.origin}${window.location.pathname}${getStudentPortalHash(student.id)}`,
                5,
                2
              ),
            }}
          />
          <div className="text-center sm:text-left space-y-2 max-w-sm">
            <h4 className="text-sm font-bold text-slate-900">QR-код для входу учня</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Учень може відсканувати цей QR-код камерою смартфона та ввести 6-значний код доступу: <span className="font-mono font-bold text-indigo-600">{student.accessCode || '—'}</span>
            </p>
            <div className="pt-1">
              <span className="text-[11px] text-slate-400">
                Автономна генерація чистим SVG без звернень до сторонніх серверів
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Середній бал</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {trendData.overallAverage}
            </span>
            <span className="text-xs text-slate-400">/ 12</span>
          </div>
          <span className="text-[11px] text-slate-400">за всі уроки</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Тренд успішності</span>
          <div className="mt-1 flex items-center gap-1.5">
            {trendData.trendDirection === 'up' && (
              <>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="text-xl font-black text-emerald-600">
                  +{trendData.difference}
                </span>
              </>
            )}
            {trendData.trendDirection === 'down' && (
              <>
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <span className="text-xl font-black text-rose-600">
                  {trendData.difference}
                </span>
              </>
            )}
            {trendData.trendDirection === 'stable' && (
              <>
                <Minus className="w-5 h-5 text-slate-400" />
                <span className="text-xl font-bold text-slate-600">Стабільно</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {trendData.previousAverage} → {trendData.recentAverage} балів
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Відвідування</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              {attendanceRate}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {trendData.attendedCount} з {trendData.totalCount} уроків
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Пропуски</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Промпт для ШІ (повідомлення для батьків)
              </h3>
              <p className="text-xs text-slate-500">
                Готовий текст із поурочними спостереженнями та делікатним урахуванням контексту
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector (Weekly, Monthly, Quarter, Semester, Custom) */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <PeriodSelector
            value={periodText}
            onChange={(newText, start, end) => {
              setPeriodText(newText);
              setPeriodStartDate(start);
              setPeriodEndDate(end);
            }}
          />
        </div>

        {/* AI Quick Actions */}
        <AiQuickActions prompt={aiPrompt} />

        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={aiPrompt}
            className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 focus:outline-none leading-relaxed select-all"
          />
        </div>
      </div>

      {/* Full Lesson History */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          Хронологія відвідування та оцінювання ({trendData.points.length} уроків)
        </h3>
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {trendData.points.map((p) => (
            <div
              key={p.lessonId}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                {p.absent ? (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {p.date}
                    </span>
                    <span className="text-xs text-slate-400">Урок №{p.lessonNumber}</span>
                    {p.absent && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                        Пропуск
                      </span>
                    )}
                  </div>
                  {p.topic && (
                    <div className="text-xs text-slate-600">{p.topic}</div>
                  )}
                  {p.notes && (
                    <div className="text-xs text-amber-700 mt-0.5 italic">
                      Нотатка: {p.notes}
                    </div>
                  )}
                </div>
              </div>

              {!p.absent && (
                <div className="flex items-center gap-2 sm:self-center self-end">
                  <span className="text-xs text-slate-400">Середній:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
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
