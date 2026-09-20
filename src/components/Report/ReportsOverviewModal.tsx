import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, calculateStudentTrend, getAllParallels } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import {
  X,
  Sparkles,
  Search,
  UserCheck,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit2,
  BarChart2,
  CheckSquare,
  Square,
  Layers,
  ExternalLink,
} from 'lucide-react';

interface ReportsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClassId: string;
  className: string;
  db: DatabaseSchema;
  initialFilterMode?: string;
  onSelectStudentForReport: (student: Student) => void;
  onOpenAnalytics: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onOpenBatchReport: (students: Student[], groupName: string) => void;
  onDeleteStudent: (studentId: string) => void;
}

export const ReportsOverviewModal: React.FC<ReportsOverviewModalProps> = ({
  isOpen,
  onClose,
  currentClassId,
  className,
  db,
  initialFilterMode,
  onSelectStudentForReport,
  onOpenAnalytics,
  onEditStudent,
  onOpenBatchReport,
  onDeleteStudent,
}) => {
  const [selectedFilterMode, setSelectedFilterMode] = useState<string>(
    initialFilterMode || currentClassId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialFilterMode) {
      setSelectedFilterMode(initialFilterMode);
    } else if (currentClassId) {
      setSelectedFilterMode(currentClassId);
    }
  }, [initialFilterMode, currentClassId]);

  // Усі паралелі школи (6-ті, 7-мі, 8-мі, 9-ті, 10-ті тощо)
  const allParallels = useMemo(() => getAllParallels(db.classes), [db.classes]);

  // Фільтруємо учнів залежно від обраного режиму (окремий клас, вся паралель або вся школа)
  const filteredStudents = useMemo(() => {
    let list: Student[] = [];

    if (selectedFilterMode === 'all') {
      list = db.students;
    } else if (selectedFilterMode.startsWith('parallel-')) {
      const par = allParallels.find((p) => p.id === selectedFilterMode);
      if (par) {
        const parClassIds = new Set(par.classIds);
        list = db.students.filter((s) => parClassIds.has(s.classId));
      } else {
        list = db.students;
      }
    } else {
      list = db.students.filter((s) => s.classId === selectedFilterMode);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }

    // Сортуємо за алфавітом
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [db.students, selectedFilterMode, allParallels, searchQuery]);

  // Назва поточної активної групи
  const activeGroupName = useMemo(() => {
    if (selectedFilterMode === 'all') {
      return 'Усі класи школи (Всі паралелі)';
    }
    if (selectedFilterMode.startsWith('parallel-')) {
      const par = allParallels.find((p) => p.id === selectedFilterMode);
      return par ? par.name : 'Паралель класів';
    }
    const found = db.classes.find((c) => c.id === selectedFilterMode);
    return found ? `Клас ${found.name}` : className;
  }, [selectedFilterMode, allParallels, db.classes, className]);

  if (!isOpen) return null;

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Зняти вибір з відфільтрованих
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      // Додати всіх відфільтрованих
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleLaunchBatchReport = () => {
    const studentsToReport = db.students.filter((s) => selectedStudentIds.has(s.id));
    if (studentsToReport.length === 0) return;
    onOpenBatchReport(studentsToReport, activeGroupName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Центр звітів та аналітики для батьків
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Формуйте звіти по одному або пакетно одразу для всього класу чи паралелі
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Selection Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Вибірка:
            </span>

            {/* Класи та Паралелі */}
            <select
              value={selectedFilterMode}
              onChange={(e) => {
                setSelectedFilterMode(e.target.value);
                setSelectedStudentIds(new Set());
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">Усі класи школи (Всі паралелі)</option>

              {allParallels.length > 0 && (
                <optgroup label="Об'єднання за паралелями">
                  {allParallels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Окремі класи">
                {db.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Клас {c.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Зняти вибір</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Вибрати всіх ({filteredStudents.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Кнопка Пакетного промпту */}
          {selectedStudentIds.size > 0 && (
            <button
              type="button"
              onClick={handleLaunchBatchReport}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition active:scale-95 animate-in fade-in"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Пакетний звіт для ШІ ({selectedStudentIds.size})</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук учня за прізвищем чи ім'ям..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List of students */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-10">
              Учнів у цій вибірці не знайдено
            </p>
          ) : (
            filteredStudents.map((student) => {
              const isSelected = selectedStudentIds.has(student.id);
              const studentClass = db.classes.find((c) => c.id === student.classId);
              const analytics = calculateStudentAnalytics(student, db);
              const trend = calculateStudentTrend(student, db);
              const badgeClass = getScoreBadgeClass(analytics.totalAverage);

              return (
                <div
                  key={student.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                      : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  {/* Left: Checkbox + Student details */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStudent(student.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                    />

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {student.name}
                        </span>

                        {studentClass && (
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {studentClass.name}
                          </span>
                        )}

                        {analytics.absentLessonsCount > 0 ? (
                          <span className="text-[10px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900">
                            {analytics.absentLessonsCount} пропуск.
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                            <UserCheck className="w-2.5 h-2.5" /> 100%
                          </span>
                        )}
                      </div>

                      {student.notes ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-1 italic">
                          Особливості: {student.notes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          {trend.totalCount} уроків в базі
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Trend KPI + Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Trend KPI */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-xs border font-bold ${badgeClass}`}>
                          {analytics.totalAverage > 0 ? `${analytics.totalAverage} / 12` : '—'}
                        </span>
                      </div>

                      <div className="flex items-center" title="Динаміка успішності">
                        {trend.trendDirection === 'up' && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{trend.difference}
                          </span>
                        )}
                        {trend.trendDirection === 'down' && (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center">
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />{trend.difference}
                          </span>
                        )}
                        {trend.trendDirection === 'stable' && (
                          <span className="text-xs font-medium text-slate-400 flex items-center">
                            <Minus className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Відкрити у новій вкладці */}
                      <a
                        href={getStudentHash(student.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                        title="Відкрити сторінку учня в новій вкладці браузера"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Динаміка */}
                      <button
                        type="button"
                        onClick={() => onOpenAnalytics(student)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                        title="Детальна динаміка та графіки успішності"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>

                      {/* Редагувати */}
                      <button
                        type="button"
                        onClick={() => onEditStudent(student)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                        title="Редагувати учня та особливості сприйняття"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Персональний звіт */}
                      <button
                        type="button"
                        onClick={() => onSelectStudentForReport(student)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-xs transition"
                        title="Сформувати персональний звіт для одного учня"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Звіт</span>
                      </button>

                      {/* Видалити */}
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student.id)}
                        title="Видалити учня"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span>У вибірці: <strong>{filteredStudents.length}</strong> учнів</span>
            {selectedStudentIds.size > 0 && (
              <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                (Обрано для пакетного звіту: {selectedStudentIds.size})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentIds.size > 0 && (
              <button
                type="button"
                onClick={handleLaunchBatchReport}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition"
              >
                Пакетний звіт ({selectedStudentIds.size})
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
