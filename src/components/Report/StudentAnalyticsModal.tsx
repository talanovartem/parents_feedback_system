import React, { useState } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentTrend, calculateStudentAnalytics } from '../../utils/analytics';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  UserCheck,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';

interface StudentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  db: DatabaseSchema;
  onOpenReport: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}

export const StudentAnalyticsModal: React.FC<StudentAnalyticsModalProps> = ({
  isOpen,
  onClose,
  student,
  db,
  onOpenReport,
  onEditStudent,
}) => {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (!isOpen || !student) return null;

  const currentClass = db.classes.find((c) => c.id === student.classId);
  const trendData = calculateStudentTrend(student, db);
  const generalAnalytics = calculateStudentAnalytics(student, db);

  const pointsWithScores = trendData.points.filter((p) => !p.absent && p.averageScore !== undefined);

  // SVG Chart Dimensions
  const chartWidth = 600;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getCoordinates = (index: number, score: number, total: number) => {
    const x = total <= 1 ? paddingX + innerWidth / 2 : paddingX + (index / (total - 1)) * innerWidth;
    // Score 0 -> innerHeight + paddingTop, Score 12 -> paddingTop
    const y = paddingTop + (1 - score / 12) * innerHeight;
    return { x, y };
  };

  const svgPoints = pointsWithScores.map((p, idx) => {
    const coords = getCoordinates(idx, p.averageScore || 0, pointsWithScores.length);
    return { ...p, ...coords, originalIndex: idx };
  });

  const pathD = svgPoints.length > 0
    ? svgPoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '')
    : '';

  const hoveredPoint = hoveredPointIndex !== null ? svgPoints[hoveredPointIndex] : null;

  const attendanceRate =
    trendData.totalCount > 0
      ? Math.round((trendData.attendedCount / trendData.totalCount) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-sm">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{student.name}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {currentClass?.name || 'Клас не знайдено'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Хронологічна динаміка успішності та поурочний прогрес
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEditStudent(student)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
              title="Редагувати профіль та особливості сприйняття"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Редагувати профіль</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenReport(student)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
              title="Сформувати персональний звіт для батьків"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Звіт для батьків</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notes badge if present */}
          {student.notes && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start gap-2.5">
              <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs whitespace-nowrap pt-0.5">
                Контекст учня:
              </span>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {student.notes}
              </p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Середній бал</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {trendData.overallAverage}
                </span>
                <span className="text-xs text-slate-400">/ 12</span>
              </div>
              <span className="text-[11px] text-slate-400">за весь період</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Тренд динаміки</span>
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

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
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

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
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

          {/* SVG Trend Chart */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Графік поурочного середнього балу
              </h3>
              <span className="text-xs text-slate-400">шкала від 0 до 12 балів</span>
            </div>

            {pointsWithScores.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Недостатньо оцінених уроків для побудови графіку
              </div>
            ) : (
              <div className="relative w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 select-none overflow-visible"
                >
                  {/* Grid Lines */}
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

                  {/* Gradient Area under curve */}
                  {svgPoints.length > 1 && (
                    <path
                      d={`${pathD} L ${svgPoints[svgPoints.length - 1].x},${chartHeight - paddingBottom} L ${svgPoints[0].x},${chartHeight - paddingBottom} Z`}
                      fill="currentColor"
                      className="text-indigo-500/10 dark:text-indigo-400/10"
                    />
                  )}

                  {/* Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-indigo-600 dark:text-indigo-400"
                  />

                  {/* Data Points */}
                  {svgPoints.map((pt, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    const score = pt.averageScore || 0;
                    const isHigh = score >= 10;
                    const isLow = score < 6;

                    return (
                      <g
                        key={pt.lessonId}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          className={`transition-all duration-150 ${
                            isHigh
                              ? 'fill-emerald-500 stroke-white dark:stroke-slate-900'
                              : isLow
                              ? 'fill-rose-500 stroke-white dark:stroke-slate-900'
                              : 'fill-indigo-600 stroke-white dark:stroke-slate-900'
                          }`}
                          strokeWidth={2}
                        />
                        <text
                          x={pt.x}
                          y={chartHeight - paddingBottom + 16}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-400 font-mono"
                        >
                          {pt.date.slice(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredPoint && (
                  <div
                    className="absolute top-2 right-4 bg-slate-900/90 text-white dark:bg-slate-800 text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-all duration-150 border border-slate-700"
                  >
                    <div className="font-semibold text-indigo-300">
                      Урок {hoveredPoint.date} (№{hoveredPoint.lessonNumber})
                    </div>
                    {hoveredPoint.topic && (
                      <div className="text-[11px] text-slate-300 line-clamp-1">{hoveredPoint.topic}</div>
                    )}
                    <div className="mt-1 font-bold">
                      Середній бал:{' '}
                      <span className="text-emerald-400">{hoveredPoint.averageScore} / 12</span>
                    </div>
                    {hoveredPoint.notes && (
                      <div className="mt-1 text-[11px] text-amber-200 border-t border-slate-700/80 pt-1">
                        Нотатка: {hoveredPoint.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Criteria Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              Середні бали за критеріями
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {db.criteria.map((c) => {
                const score = generalAnalytics.averageScores[c.id];
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                      {c.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        score !== undefined
                          ? score >= 10
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : score >= 7
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {score !== undefined ? `${score} / 12` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lesson by Lesson History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Хронологія уроків ({trendData.points.length})
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {trendData.points.map((p) => (
                  <div
                    key={p.lessonId}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
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
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Відсутній
                            </span>
                          )}
                        </div>
                        {p.topic && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                            {p.topic}
                          </div>
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
                        <span className="text-xs text-slate-500 dark:text-slate-400">Середній:</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                          {p.averageScore !== undefined ? `${p.averageScore} / 12` : 'Немає оцінок'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
