import React, { useState } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics } from '../../utils/analytics';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { X, Sparkles, Search, UserCheck, Trash2 } from 'lucide-react';

interface ReportsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClassId: string;
  className: string;
  db: DatabaseSchema;
  onSelectStudentForReport: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
}

export const ReportsOverviewModal: React.FC<ReportsOverviewModalProps> = ({
  isOpen,
  onClose,
  currentClassId,
  className,
  db,
  onSelectStudentForReport,
  onDeleteStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const students = db.students
    .filter((s) => s.classId === currentClassId)
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const classLessons = db.lessons.filter((l) => l.classId === currentClassId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Генератор звітів для батьків — {className}
              </h2>
              <p className="text-xs text-slate-500">
                Оберіть учня, щоб отримати готову картку успішності та згенерувати промпт для ШІ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук учня за прізвищем чи ім'ям..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List of students */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {students.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">
              Учнів не знайдено
            </p>
          ) : (
            students.map((student) => {
              const analytics = calculateStudentAnalytics(student, db, classLessons);
              const badgeClass = getScoreBadgeClass(analytics.totalAverage);

              return (
                <div
                  key={student.id}
                  onClick={() => {
                    onSelectStudentForReport(student);
                  }}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-300 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-900 transition-colors">
                        {student.name}
                      </span>
                      {analytics.absentLessonsCount > 0 ? (
                        <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.2 rounded border border-rose-200">
                          {analytics.absentLessonsCount} пропуск(ів)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> 100% присутність
                        </span>
                      )}
                    </div>
                    {student.notes && (
                      <p className="text-xs text-slate-400 line-clamp-1">{student.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-medium">Середній бал</div>
                      <span className={`px-2 py-0.5 rounded text-xs border font-bold ${badgeClass}`}>
                        {analytics.totalAverage > 0 ? `${analytics.totalAverage} / 12` : '—'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Сформувати звіт
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStudent(student.id);
                      }}
                      title="Видалити учня"
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Всього учнів у класі: {students.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
