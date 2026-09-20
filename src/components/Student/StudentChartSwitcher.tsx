import React, { useState, useMemo } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, calculateStudentTrend } from '../../utils/analytics';
import {
  TrendingUp,
  BarChart3,
  Sliders,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export type ChartMode = 'line' | 'bar' | 'criteria' | 'matrix';

interface StudentChartSwitcherProps {
  student: Student;
  db: DatabaseSchema;
}

export const StudentChartSwitcher: React.FC<StudentChartSwitcherProps> = ({ student, db }) => {
  const [activeMode, setActiveMode] = useState<ChartMode>('line');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const studentClass = db.classes.find((c) => c.id === student.classId);
  const trendData = calculateStudentTrend(student, db);
  const studentAnalytics = calculateStudentAnalytics(student, db);

  // Класова аналітика для порівняння критеріїв
  const classStudents = useMemo(() => {
    return db.students.filter((s) => s.classId === student.classId);
  }, [db.students, student.classId]);

  const classCriteriaAverages = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const crit of db.criteria) {
      totals[crit.id] = { sum: 0, count: 0 };
    }

    for (const std of classStudents) {
      const an = calculateStudentAnalytics(std, db);
      for (const [critId, avg] of Object.entries(an.averageScores)) {
        if (totals[critId] && avg > 0) {
          totals[critId].sum += avg;
          totals[critId].count += 1;
        }
      }
    }

    const averages: Record<string, number> = {};
    for (const [critId, data] of Object.entries(totals)) {
      averages[critId] = data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0;
    }
    return averages;
  }, [db, classStudents]);

  const pointsWithScores = useMemo(() => {
    return trendData.points.filter((p) => !p.absent && p.averageScore !== undefined);
  }, [trendData.points]);

  // Розміри SVG графіків
  const chartWidth = 650;
  const chartHeight = 170;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getCoordinates = (index: number, score: number, total: number) => {
    const x = total <= 1 ? paddingX + innerWidth / 2 : paddingX + (index / (total - 1)) * innerWidth;
    const y = paddingTop + (1 - score / 12) * innerHeight;
    return { x, y };
  };

  const svgLinePoints = pointsWithScores.map((p, idx) => {
    const coords = getCoordinates(idx, p.averageScore || 0, pointsWithScores.length);
    return { ...p, ...coords, originalIndex: idx };
  });

  const pathD =
    svgLinePoints.length > 0
      ? svgLinePoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '')
      : '';

  const hoveredPoint = hoveredPointIndex !== null ? trendData.points[hoveredPointIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Chart Mode Switcher Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Візуалізація успішності:
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMode('line')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'line'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Лінійний тренд</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('bar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'bar'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Стовпчики уроків</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('criteria')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'criteria'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Учень vs Клас</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('matrix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeMode === 'matrix'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Матриця уроків</span>
          </button>
        </div>
      </div>

      {/* Chart View Content */}
      <div className="p-5">
        {/* 1. LINE CHART */}
        {activeMode === 'line' && (
          <div className="relative">
            {pointsWithScores.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Недостатньо оцінених уроків для побудови графіку
              </div>
            ) : (
              <div className="relative w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-48 select-none overflow-visible"
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
                          className="text-slate-200"
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

                  {/* Gradient Area */}
                  {svgLinePoints.length > 1 && (
                    <path
                      d={`${pathD} L ${svgLinePoints[svgLinePoints.length - 1].x},${chartHeight - paddingBottom} L ${svgLinePoints[0].x},${chartHeight - paddingBottom} Z`}
                      fill="currentColor"
                      className="text-indigo-500/10"
                    />
                  )}

                  {/* Trend Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-indigo-600"
                  />

                  {/* Points */}
                  {svgLinePoints.map((pt) => {
                    const isHovered = hoveredPointIndex === pt.originalIndex;
                    const score = pt.averageScore || 0;
                    return (
                      <g
                        key={pt.lessonId}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIndex(pt.originalIndex)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          className={`transition-all duration-150 ${
                            score >= 10
                              ? 'fill-emerald-500 stroke-white'
                              : score < 6
                              ? 'fill-rose-500 stroke-white'
                              : 'fill-indigo-600 stroke-white'
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

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-4 bg-slate-900/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-all duration-150 border border-slate-700">
                    <div className="font-semibold text-indigo-300">
                      Урок {hoveredPoint.date} (№{hoveredPoint.lessonNumber})
                    </div>
                    {hoveredPoint.topic && (
                      <div className="text-[11px] text-slate-300 line-clamp-1">{hoveredPoint.topic}</div>
                    )}
                    <div className="mt-1 font-bold">
                      {hoveredPoint.absent ? (
                        <span className="text-rose-400">Відсутній на уроці</span>
                      ) : (
                        <span>
                          Середній бал:{' '}
                          <span className="text-emerald-400">{hoveredPoint.averageScore} / 12</span>
                        </span>
                      )}
                    </div>
                    {hoveredPoint.notes && (
                      <div className="mt-1 text-[11px] text-amber-200 border-t border-slate-700/80 pt-1">
                        {hoveredPoint.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. BAR CHART */}
        {activeMode === 'bar' && (
          <div className="relative">
            {trendData.points.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Уроків не знайдено</div>
            ) : (
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-48 select-none overflow-visible"
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
                          className="text-slate-200"
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
                  {trendData.points.map((pt, idx) => {
                    const totalBars = trendData.points.length;
                    const slotWidth = innerWidth / totalBars;
                    const barWidth = Math.min(Math.max(slotWidth * 0.65, 8), 32);
                    const x = paddingX + idx * slotWidth + (slotWidth - barWidth) / 2;

                    const score = pt.averageScore || 0;
                    const barHeight = pt.absent ? innerHeight * 0.15 : (score / 12) * innerHeight;
                    const y = paddingTop + innerHeight - barHeight;

                    const isHovered = hoveredPointIndex === idx;

                    return (
                      <g
                        key={pt.lessonId}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={3}
                          className={`transition-all duration-150 ${
                            pt.absent
                              ? 'fill-rose-300 stroke-rose-500'
                              : score >= 10
                              ? 'fill-emerald-500 hover:fill-emerald-400'
                              : score >= 7
                              ? 'fill-indigo-600 hover:fill-indigo-500'
                              : score >= 4
                              ? 'fill-amber-500 hover:fill-amber-400'
                              : 'fill-rose-500 hover:fill-rose-400'
                          } ${isHovered ? 'opacity-100 ring-2 ring-indigo-400' : 'opacity-90'}`}
                        />

                        <text
                          x={x + barWidth / 2}
                          y={y - 4}
                          textAnchor="middle"
                          className="text-[9px] font-bold fill-slate-700 font-mono"
                        >
                          {pt.absent ? 'Н' : score}
                        </text>

                        <text
                          x={x + barWidth / 2}
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

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-4 bg-slate-900/90 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none transition-all duration-150 border border-slate-700">
                    <div className="font-semibold text-indigo-300">
                      Урок {hoveredPoint.date} (№{hoveredPoint.lessonNumber})
                    </div>
                    {hoveredPoint.topic && (
                      <div className="text-[11px] text-slate-300 line-clamp-1">{hoveredPoint.topic}</div>
                    )}
                    <div className="mt-1 font-bold">
                      {hoveredPoint.absent ? (
                        <span className="text-rose-400">Пропуск («Н»)</span>
                      ) : (
                        <span>
                          Середній бал:{' '}
                          <span className="text-emerald-400">{hoveredPoint.averageScore} / 12</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. CRITERIA COMPARISON (STUDENT VS CLASS) */}
        {activeMode === 'criteria' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                  <span>Учень: <strong>{student.name}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                  <span>Середнє по класу: <strong>{studentClass?.name}</strong></span>
                </span>
              </div>
              <span>Шкала 0 – 12 балів</span>
            </div>

            <div className="space-y-3">
              {db.criteria.map((crit) => {
                const studentScore = studentAnalytics.averageScores[crit.id] || 0;
                const classAvg = classCriteriaAverages[crit.id] || 0;
                const diff = Number((studentScore - classAvg).toFixed(1));

                return (
                  <div key={crit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">{crit.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-bold">
                          {studentScore} б.
                        </span>
                        <span className="text-slate-400 font-normal">
                          (клас: {classAvg})
                        </span>
                        {diff !== 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              diff > 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual comparative progress bars */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max((studentScore / 12) * 100, 0), 100)}%` }}
                        />
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                        <div
                          className="bg-slate-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max((classAvg / 12) * 100, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. MATRIX OF LESSONS */}
        {activeMode === 'matrix' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {trendData.points.map((pt) => {
              const isAbsent = pt.absent;
              const score = pt.averageScore || 0;

              return (
                <div
                  key={pt.lessonId}
                  className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                    isAbsent
                      ? 'bg-rose-50 border-rose-200'
                      : score >= 10
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : score >= 7
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                    <span>{pt.date.slice(5)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">№{pt.lessonNumber}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    {isAbsent ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                        <XCircle className="w-3 h-3" /> Пропуск
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> {score} / 12
                      </span>
                    )}
                  </div>

                  {pt.topic && (
                    <p className="text-[10px] text-slate-500 line-clamp-1 truncate">
                      {pt.topic}
                    </p>
                  )}
                  {pt.notes && (
                    <p className="text-[10px] text-amber-700 italic line-clamp-1 truncate">
                      {pt.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
