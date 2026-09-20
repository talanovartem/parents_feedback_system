import React, { useState, useMemo } from 'react';
import { DatabaseSchema, SavedReport, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateBatchAiPrompt } from '../../utils/analytics';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { parseBatchAiResponse, buildSavedReport } from '../../utils/reportParser';
import { AiQuickActions } from './AiQuickActions';
import { PeriodSelector } from './PeriodSelector';
import { X, Users, Sparkles, Layers, CheckCircle2, Download, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groupName: string;
  db: DatabaseSchema;
  onToggleReportSent?: (studentId: string, periodString: string) => void;
  onSaveBatchReports?: (reports: SavedReport[]) => void;
}

export const BatchReportModal: React.FC<BatchReportModalProps> = ({
  isOpen,
  onClose,
  students,
  groupName,
  db,
  onToggleReportSent,
  onSaveBatchReports,
}) => {
  const defaultPreset = getPeriodPresets()[0];
  const [periodText, setPeriodText] = useState(defaultPreset.description);
  const [startDate, setStartDate] = useState<string | undefined>(defaultPreset.startDate);
  const [endDate, setEndDate] = useState<string | undefined>(defaultPreset.endDate);
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [importText, setImportText] = useState('');
  const [parsedReports, setParsedReports] = useState<ReturnType<typeof parseBatchAiResponse> | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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

  const handleParse = () => {
    if (!importText.trim()) return;
    const result = parseBatchAiResponse(importText, students);
    setParsedReports(result);
    if (result.matched.length === 0) {
      toast.warning('Не вдалося знайти жодного учня у вставленому тексті. Перевірте формат відповіді ШІ.');
    } else {
      toast.success(`Розпізнано ${result.matched.length} звітів для учнів`);
    }
  };

  const handleSaveAll = () => {
    if (!parsedReports || parsedReports.matched.length === 0) return;
    const reports = parsedReports.matched.map((r) =>
      buildSavedReport(r.studentId, periodText, r.content)
    );
    onSaveBatchReports?.(reports);
    setSavedIds(new Set(parsedReports.matched.map((r) => r.studentId)));
    toast.success(`Збережено ${reports.length} звітів ✅`);
  };

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

        {/* Period Selector + Tabs */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[280px]">
              <PeriodSelector
                value={periodText}
                onChange={(newText, start, end) => {
                  setPeriodText(newText);
                  setStartDate(start);
                  setEndDate(end);
                  setParsedReports(null);
                }}
              />
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>У вибірці: <strong className="text-slate-800">{students.length} учнів</strong></span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'prompt'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              📤 Промпт для ШІ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              📥 Вставити відповідь ШІ
            </button>
          </div>
        </div>

        {/* Tab: Prompt */}
        {activeTab === 'prompt' && (
          <>
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
                  <li>Натисніть кнопку вашої моделі (<strong>ChatGPT</strong>, <strong>Gemini</strong> або <strong>Claude</strong>) — текст скопіюється і відкриється вкладка сервісу.</li>
                  <li>Вставте (Ctrl+V) промпт у чат, і ШІ згенерує персоналізовані повідомлення для батьків кожного учня.</li>
                  <li>Перейдіть на вкладку <strong>«📥 Вставити відповідь ШІ»</strong>, щоб зберегти готові тексти в систему.</li>
                </ol>
              </div>
            </div>
          </>
        )}

        {/* Tab: Import */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Вставте сюди відповідь від ШІ (всі тексти одночасно)
              </label>
              <textarea
                rows={12}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setParsedReports(null);
                  setSavedIds(new Set());
                }}
                placeholder={`Вставте відповідь від ChatGPT / Gemini / Claude...\n\nСистема автоматично розпізнає маркери:\n=== ЗВІТ ДЛЯ: Ім'я учня ===\n...текст...\n=== КІНЕЦЬ ЗВІТУ ===\n\nАбо заголовки у форматі:\n## Повідомлення для батьків: Ім'я учня`}
                className="w-full font-mono text-xs px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed bg-white"
              />
              <button
                type="button"
                onClick={handleParse}
                disabled={!importText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Розпізнати та попередньо переглянути
              </button>
            </div>

            {/* Parsed results preview */}
            {parsedReports && (
              <div className="space-y-4">
                {parsedReports.unmatched.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Не вдалося зіставити {parsedReports.unmatched.length} блок(и) з учнями:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                        {parsedReports.unmatched.map((u, i) => <li key={i} className="truncate">{u}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {parsedReports.matched.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">
                        Розпізнано {parsedReports.matched.length} звітів:
                      </p>
                      <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={savedIds.size === parsedReports.matched.length}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savedIds.size === parsedReports.matched.length
                          ? '✅ Всі збережено'
                          : `Зберегти всі (${parsedReports.matched.length})`}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {parsedReports.matched.map((r) => (
                        <div
                          key={r.studentId}
                          className={`p-3 rounded-xl border text-xs ${
                            savedIds.has(r.studentId)
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {savedIds.has(r.studentId) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {r.studentName}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed line-clamp-3">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {activeTab === 'prompt'
              ? `Згенеровано промпт обсягом ${promptText.length} символів`
              : parsedReports
              ? `Розпізнано ${parsedReports.matched.length} з ${students.length} учнів`
              : 'Вставте відповідь ШІ і натисніть «Розпізнати»'}
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
