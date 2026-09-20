import React, { useState, useMemo } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateBatchAiPrompt } from '../../utils/analytics';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { AiQuickActions } from './AiQuickActions';
import { PeriodSelector } from './PeriodSelector';
import { X, Users, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groupName: string;
  db: DatabaseSchema;
  onToggleReportSent?: (studentId: string, periodString: string) => void;
}

export const BatchReportModal: React.FC<BatchReportModalProps> = ({
  isOpen,
  onClose,
  students,
  groupName,
  db,
  onToggleReportSent,
}) => {
  const defaultPreset = getPeriodPresets()[0];
  const [periodText, setPeriodText] = useState(defaultPreset.description);
  const [startDate, setStartDate] = useState<string | undefined>(defaultPreset.startDate);
  const [endDate, setEndDate] = useState<string | undefined>(defaultPreset.endDate);

  const promptText = useMemo(() => {
    if (students.length === 0) return '';

    const batchData = students.map((std) => {
      const cls = db.classes.find((c) => c.id === std.classId);
      const studentLessons = db.lessons.filter((l) => l.classId === std.classId);
      const matched = filterLessonsByDateRange(studentLessons, startDate, endDate);
      const periodLessons = matched.length > 0 ? matched : studentLessons;

      const analytics = calculateStudentAnalytics(std, db, periodLessons);
      return {
        student: std,
        className: cls?.name || 'Клас',
        analytics,
      };
    });

    return generateBatchAiPrompt(batchData, db.criteria, groupName, periodText);
  }, [students, db, groupName, periodText, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Пакетний звіт для ШІ
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                  {students.length} учнів
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Група: <strong className="text-slate-700">{groupName}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Selector Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[280px]">
            <PeriodSelector
              value={periodText}
              onChange={(newText, start, end) => {
                setPeriodText(newText);
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>У вибірці: <strong className="text-slate-800">{students.length} учнів</strong></span>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <AiQuickActions prompt={promptText} />

          {onToggleReportSent && (
            <button
              type="button"
              onClick={() => {
                students.forEach((s) => {
                  if (!db.sentReports?.[`${s.id}:${periodText}`]) {
                    onToggleReportSent(s.id, periodText);
                  }
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shadow-xs"
              title="Позначити всіх обраних учнів як таких, кому надіслано звіт за цей період"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Позначити всіх ({students.length}) як надіслано</span>
            </button>
          )}
        </div>

        {/* Content Prompt Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="relative">
            <textarea
              readOnly
              rows={15}
              value={promptText}
              className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-50/90 text-slate-800 focus:outline-none leading-relaxed select-all"
            />
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              💡 Як працювати з пакетним промптом:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Оберіть звітний період (за замовчуванням встановлено <strong>поточний тиждень</strong>, або оберіть місяць/чверть).</li>
              <li>Натисніть кнопку вашої моделі (<strong>ChatGPT</strong>, <strong>Gemini</strong> або <strong>Claude</strong>) — текст скопіюється автоматично і відкриється вкладка сервісу.</li>
              <li>Вставте (Ctrl+V) промпт у чат, і ШІ згенерує персоналізовані повідомлення для батьків кожного учня.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            Згенеровано промпт обсягом {promptText.length} символів
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
