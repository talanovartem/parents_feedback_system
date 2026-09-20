import React, { useState, useMemo } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateBatchAiPrompt } from '../../utils/analytics';
import { AiQuickActions } from './AiQuickActions';
import { X, Users, Sparkles, Calendar, Layers } from 'lucide-react';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groupName: string;
  db: DatabaseSchema;
}

export const BatchReportModal: React.FC<BatchReportModalProps> = ({
  isOpen,
  onClose,
  students,
  groupName,
  db,
}) => {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const monthNames = [
      'січень',
      'лютий',
      'березень',
      'квітень',
      'травень',
      'червень',
      'липень',
      'серпень',
      'вересень',
      'жовтень',
      'листопад',
      'грудень',
    ];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  });

  const promptText = useMemo(() => {
    if (students.length === 0) return '';

    const batchData = students.map((std) => {
      const cls = db.classes.find((c) => c.id === std.classId);
      const analytics = calculateStudentAnalytics(std, db);
      return {
        student: std,
        className: cls?.name || 'Клас',
        analytics,
      };
    });

    return generateBatchAiPrompt(batchData, db.criteria, groupName, period);
  }, [students, db, groupName, period]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Пакетний звіт для ШІ
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {students.length} учнів
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Група: <strong className="text-slate-700 dark:text-slate-200">{groupName}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Звітний період:
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="вересень 2026"
              className="px-2.5 py-1 text-xs font-medium border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Обрано учнів: <strong>{students.length}</strong></span>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <AiQuickActions prompt={promptText} />
        </div>

        {/* Content Prompt Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="relative">
            <textarea
              readOnly
              rows={16}
              value={promptText}
              className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950 dark:text-slate-200 focus:outline-none leading-relaxed select-all"
            />
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              💡 Як працювати з пакетним промптом:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>Натисніть кнопку вашої моделі (наприклад, <strong>ChatGPT</strong>, <strong>Gemini</strong> або <strong>Claude</strong>). Промпт скопіюється автоматично і відкриється нова вкладка.</li>
              <li>Вставте (Ctrl+V) промпт у діалогове вікно обраного ШІ.</li>
              <li>ШІ згенерує окремі структуровані повідомлення для батьків кожного обраного учня з урахуванням оцінок та індивідуальних приміток.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            Згенеровано промпт обсягом {promptText.length} символів
          </span>
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
