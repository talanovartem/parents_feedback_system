import React, { useState, useMemo } from 'react';
import { DatabaseSchema } from '../../types/feedback';
import { calculateStudentAnalytics, calculateStudentTrend, getAllParallels } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';
import {
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
  ExternalLink,
  BarChart2,
  Sparkles,
} from 'lucide-react';

interface GlobalDashboardProps {
  db: DatabaseSchema;
  onSelectClass: (classId: string) => void;
  onOpenReportsForGroup: (classOrParallelId: string) => void;
}

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
  db,
  onSelectClass,
  onOpenReportsForGroup,
}) => {
  const [chartViewMode, setChartViewMode] = useState<'parallels' | 'classes'>('parallels');

  const parallels = useMemo(() => getAllParallels(db.classes), [db.classes]);

  // Зведена аналітика по кожному учню
  const studentsAnalytics = useMemo(() => {
    return db.students.map((std) => {
      const an = calculateStudentAnalytics(std, db);
      const tr = calculateStudentTrend(std, db);
      const cls = db.classes.find((c) => c.id === std.classId);
      return {
        student: std,
        className: cls?.name || '',
        analytics: an,
        trend: tr,
      };
    });
  }, [db]);

  // Загальні KPI школи
  const schoolKpi = useMemo(() => {
    const totalStudents = db.students.length;
    const totalClasses = db.classes.length;
    const totalLessons = db.lessons.length;

    let scoreSum = 0;
    let scoreCount = 0;
    let totalAttended = 0;
    let totalExpectedAttendance = 0;

    for (const item of studentsAnalytics) {
      if (item.analytics.totalAverage > 0) {
        scoreSum += item.analytics.totalAverage;
        scoreCount += 1;
      }
      totalAttended += item.analytics.attendedLessonsCount;
      totalExpectedAttendance += item.analytics.totalLessons;
    }

    const schoolAverage = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(1)) : 0;
    const schoolAttendanceRate =
      totalExpectedAttendance > 0
        ? Math.round((totalAttended / totalExpectedAttendance) * 100)
        : 100;

    return {
      totalStudents,
      totalClasses,
      totalLessons,
      schoolAverage,
      schoolAttendanceRate,
    };
  }, [db, studentsAnalytics]);

  // Аналітика по окремих класах
  const classesStats = useMemo(() => {
    return db.classes.map((cls) => {
      const clsStudents = studentsAnalytics.filter((s) => s.student.classId === cls.id);
      const clsLessons = db.lessons.filter((l) => l.classId === cls.id);

      const scored = clsStudents.filter((s) => s.analytics.totalAverage > 0);
      const sum = scored.reduce((acc, s) => acc + s.analytics.totalAverage, 0);
      const avg = scored.length > 0 ? Number((sum / scored.length).toFixed(1)) : 0;

      return {
        id: cls.id,
        name: cls.name,
        studentsCount: clsStudents.length,
        lessonsCount: clsLessons.length,
        averageScore: avg,
      };
    });
  }, [db, studentsAnalytics]);

  // Аналітика по паралелях
  const parallelsStats = useMemo(() => {
    return parallels.map((p) => {
      const pClassIds = new Set(p.classIds);
      const pStudents = studentsAnalytics.filter((s) => pClassIds.has(s.student.classId));
      const scored = pStudents.filter((s) => s.analytics.totalAverage > 0);
      const sum = scored.reduce((acc, s) => acc + s.analytics.totalAverage, 0);
      const avg = scored.length > 0 ? Number((sum / scored.length).toFixed(1)) : 0;

      return {
        id: p.id,
        name: `Паралель ${p.grade}-х`,
        fullName: p.name,
        studentsCount: pStudents.length,
        averageScore: avg,
      };
    });
  }, [parallels, studentsAnalytics]);

  // Розподіл рівнів успішності по всій школі
  const levelDistribution = useMemo(() => {
    let high = 0; // 10-12
    let sufficient = 0; // 7-9
    let average = 0; // 4-6
    let initial = 0; // 1-3
    let noScores = 0;

    for (const s of studentsAnalytics) {
      const avg = s.analytics.totalAverage;
      if (avg >= 10) high += 1;
      else if (avg >= 7) sufficient += 1;
      else if (avg >= 4) average += 1;
      else if (avg > 0) initial += 1;
      else noScores += 1;
    }

    const total = studentsAnalytics.length || 1;
    return {
      high: { count: high, percent: Math.round((high / total) * 100) },
      sufficient: { count: sufficient, percent: Math.round((sufficient / total) * 100) },
      average: { count: average, percent: Math.round((average / total) * 100) },
      initial: { count: initial, percent: Math.round((initial / total) * 100) },
      noScores: { count: noScores, percent: Math.round((noScores / total) * 100) },
    };
  }, [studentsAnalytics]);

  // Лідери прогресу (найбільше зростання динаміки)
  const topProgressStudents = useMemo(() => {
    return studentsAnalytics
      .filter((s) => s.trend.difference > 0 && s.trend.attendedCount >= 2)
      .sort((a, b) => b.trend.difference - a.trend.difference)
      .slice(0, 6);
  }, [studentsAnalytics]);

  // Зона уваги (учні з пропущеними уроками або суттєвим спадом)
  const attentionStudents = useMemo(() => {
    return studentsAnalytics
      .filter((s) => s.trend.absentCount > 0 || s.trend.difference <= -0.5)
      .sort((a, b) => {
        // Спочатку за спадом динаміки, потім за кількістю пропусків
        if (a.trend.difference !== b.trend.difference) {
          return a.trend.difference - b.trend.difference;
        }
        return b.trend.absentCount - a.trend.absentCount;
      })
      .slice(0, 6);
  }, [studentsAnalytics]);

  // Дані для активного SVG графіку
  const activeChartData = chartViewMode === 'parallels' ? parallelsStats : classesStats;
  const chartWidth = 700;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Аналітичний дашборд школи
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Загальні показники, порівняння паралелей, розподіл рівнів знань та моніторинг динаміки
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenReportsForGroup('all')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Центр пакетних звітів ШІ</span>
          </button>
        </div>
      </div>

      {/* Global KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Учнів у базі</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {schoolKpi.totalStudents}
          </div>
          <span className="text-[11px] text-slate-400">{schoolKpi.totalClasses} класів</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Уроків проведено</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {schoolKpi.totalLessons}
          </div>
          <span className="text-[11px] text-slate-400">по всіх класах</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Середній бал школи</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {schoolKpi.schoolAverage}
            </span>
            <span className="text-xs text-slate-400">/ 12</span>
          </div>
          <span className="text-[11px] text-slate-400">загальний показник</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Відвідуваність</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {schoolKpi.schoolAttendanceRate}%
          </div>
          <span className="text-[11px] text-slate-400">рівень присутності</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Паралелей</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {parallels.length}
          </div>
          <span className="text-[11px] text-slate-400">6, 7, 8, 9, 10 класи</span>
        </div>
      </div>

      {/* Comparative Bar Chart Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Порівняння середнього балу успішності
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Клікніть на стовпчик класу, щоб перейти до його журналу
            </p>
          </div>

          {/* Toggle Button */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartViewMode('parallels')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                chartViewMode === 'parallels'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              За паралелями ({parallelsStats.length})
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('classes')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                chartViewMode === 'classes'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              За окремими класами ({classesStats.length})
            </button>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-52 select-none overflow-visible"
          >
            {/* Grid lines */}
            {[12, 8, 4, 0].map((score) => {
              const y = paddingTop + (1 - score / 12) * innerHeight;
              return (
                <g key={score}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4,4"
                    className="text-slate-200 dark:text-slate-700/60"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {score}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {activeChartData.map((item, idx) => {
              const count = activeChartData.length;
              const slotWidth = innerWidth / count;
              const barWidth = Math.min(Math.max(slotWidth * 0.55, 16), 48);
              const x = paddingX + idx * slotWidth + (slotWidth - barWidth) / 2;

              const score = item.averageScore || 0;
              const barHeight = (score / 12) * innerHeight;
              const y = paddingTop + innerHeight - barHeight;

              const isHigh = score >= 10;
              const isGood = score >= 8;
              const isMedium = score >= 6;

              return (
                <g
                  key={item.id}
                  className="cursor-pointer group"
                  onClick={() => {
                    if (chartViewMode === 'classes') {
                      onSelectClass(item.id);
                    } else {
                      onOpenReportsForGroup(item.id);
                    }
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    className={`transition-all duration-150 ${
                      isHigh
                        ? 'fill-emerald-500 hover:fill-emerald-400'
                        : isGood
                        ? 'fill-indigo-600 hover:fill-indigo-500'
                        : isMedium
                        ? 'fill-blue-500 hover:fill-blue-400'
                        : 'fill-amber-500 hover:fill-amber-400'
                    }`}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-800 dark:fill-slate-200 font-mono"
                  >
                    {score > 0 ? score : '—'}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - paddingBottom + 16}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-slate-600 dark:fill-slate-300"
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Levels Distribution Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Розподіл успішності за державними рівнями
          </h2>
          <span className="text-xs text-slate-400">Всього: {schoolKpi.totalStudents} учнів</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl h-4 overflow-hidden flex gap-0.5">
          {levelDistribution.high.count > 0 && (
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${levelDistribution.high.percent}%` }}
              title={`Високий рівень: ${levelDistribution.high.count} учнів (${levelDistribution.high.percent}%)`}
            />
          )}
          {levelDistribution.sufficient.count > 0 && (
            <div
              className="bg-indigo-500 transition-all duration-300"
              style={{ width: `${levelDistribution.sufficient.percent}%` }}
              title={`Достатній рівень: ${levelDistribution.sufficient.count} учнів (${levelDistribution.sufficient.percent}%)`}
            />
          )}
          {levelDistribution.average.count > 0 && (
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${levelDistribution.average.percent}%` }}
              title={`Середній рівень: ${levelDistribution.average.count} учнів (${levelDistribution.average.percent}%)`}
            />
          )}
          {levelDistribution.initial.count > 0 && (
            <div
              className="bg-rose-500 transition-all duration-300"
              style={{ width: `${levelDistribution.initial.percent}%` }}
              title={`Початковий рівень: ${levelDistribution.initial.count} учнів (${levelDistribution.initial.percent}%)`}
            />
          )}
          {levelDistribution.noScores.count > 0 && (
            <div
              className="bg-slate-300 dark:bg-slate-700 transition-all duration-300"
              style={{ width: `${levelDistribution.noScores.percent}%` }}
              title={`Без оцінок: ${levelDistribution.noScores.count} учнів`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
              Високий (10–12 б.)
            </span>
            <span className="text-lg font-black text-emerald-900 dark:text-emerald-200">
              {levelDistribution.high.count}{' '}
              <span className="text-xs font-normal text-emerald-700">({levelDistribution.high.percent}%)</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50">
            <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">
              Достатній (7–9 б.)
            </span>
            <span className="text-lg font-black text-indigo-900 dark:text-indigo-200">
              {levelDistribution.sufficient.count}{' '}
              <span className="text-xs font-normal text-indigo-700">({levelDistribution.sufficient.percent}%)</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">
              Середній (4–6 б.)
            </span>
            <span className="text-lg font-black text-amber-900 dark:text-amber-200">
              {levelDistribution.average.count}{' '}
              <span className="text-xs font-normal text-amber-700">({levelDistribution.average.percent}%)</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">
              Початковий (1–3 б.)
            </span>
            <span className="text-lg font-black text-rose-900 dark:text-rose-200">
              {levelDistribution.initial.count}{' '}
              <span className="text-xs font-normal text-rose-700">({levelDistribution.initial.percent}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Focus Grids: Progress Leaders & Attention Required */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Leaders */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Лідери позитивної динаміки
            </h2>
          </div>

          {topProgressStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Недостатньо уроків для підрахунку динаміки</p>
          ) : (
            <div className="space-y-2">
              {topProgressStudents.map((s) => (
                <div
                  key={s.student.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {s.student.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {s.className}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Динаміка: {s.trend.previousAverage} → {s.trend.recentAverage} б.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center">
                      +{s.trend.difference} ↗
                    </span>

                    <a
                      href={getStudentHash(s.student.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      title="Відкрити картку учня в новій вкладці"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attention Required */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Зона уваги (пропуски та спад)
            </h2>
          </div>

          {attentionStudents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Всі учні мають стабільні результати</p>
          ) : (
            <div className="space-y-2">
              {attentionStudents.map((s) => (
                <div
                  key={s.student.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {s.student.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {s.className}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {s.trend.absentCount > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {s.trend.absentCount} пропуск.
                        </span>
                      )}
                      <span>Сер. бал: {s.analytics.totalAverage} / 12</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {s.trend.trendDirection === 'down' && (
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center">
                        <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                        {s.trend.difference}
                      </span>
                    )}

                    <a
                      href={getStudentHash(s.student.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      title="Відкрити картку учня в новій вкладці"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
