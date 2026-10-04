import React, { useState, useMemo } from 'react';
import { DatabaseSchema, SavedReport, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateBatchAiPrompt, generateBatchRevisionPrompt } from '../../utils/analytics';
import { describePeriodDuration, filterLessonsByDateRange, getReportPeriod, saveReportPeriod } from '../../utils/periodHelper';
import { parseBatchAiResponse, buildSavedReport } from '../../utils/reportParser';
import { AiQuickActions } from './AiQuickActions';
import { PeriodSelector } from './PeriodSelector';
import { X, Users, Sparkles, Layers, CheckCircle2, Download, AlertCircle, Save, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { SaveStatus } from '../../services/storage';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  groupName: string;
  db: DatabaseSchema;
  onToggleReportSent?: (studentId: string, periodString: string) => void;
  onSaveBatchReports?: (reports: SavedReport[]) => Promise<SaveStatus>;
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
  const [period, setPeriod] = useState(getReportPeriod);
  const { text: periodText, startDate, endDate } = period;
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');
  const [importText, setImportText] = useState('');
  const [parsedReports, setParsedReports] = useState<ReturnType<typeof parseBatchAiResponse> | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [revisionTargets, setRevisionTargets] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const validDateRange = !!startDate && !!endDate && startDate <= endDate;

  const { promptText, eligibleCount } = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return { promptText: '', eligibleCount: 0 };
    const batchData = students.flatMap((std) => {
      const cls = db.classes.find((c) => c.id === std.classId);
      const studentLessons = db.lessons.filter((l) => l.classId === std.classId);
      const matched = filterLessonsByDateRange(studentLessons, startDate, endDate);
      if (matched.length === 0) return [];

      const analytics = calculateStudentAnalytics(std, db, matched);
      return [{
        student: std,
        className: cls?.name || 'Клас',
        analytics,
      }];
    });

    return {
      promptText: batchData.length ? generateBatchAiPrompt(batchData, db.criteria, groupName, `${periodText} (тривалість: ${describePeriodDuration(startDate, endDate)})`) : '',
      eligibleCount: batchData.length,
    };
  }, [students, db, groupName, periodText, startDate, endDate]);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!importText.trim()) return;
    const targetStudents = revisionTargets.size ? students.filter((student) => revisionTargets.has(student.id)) : students;
    const result = parseBatchAiResponse(importText, targetStudents);
    if (revisionTargets.size && parsedReports) {
      const updated = new Map(result.matched.map((report) => [report.studentId, report]));
      setParsedReports({
        matched: parsedReports.matched.map((report) => updated.get(report.studentId) || report),
        unmatched: result.unmatched,
      });
      setSavedIds((previous) => new Set([...previous].filter((id) => !updated.has(id))));
      if (result.unmatched.length === 0 && result.matched.length > 0) {
        setRevisionTargets(new Set());
        setRevisionPrompt('');
      }
    } else {
      setParsedReports(result);
      setSelectedIds(new Set(result.matched.map((report) => report.studentId)));
      setSavedIds(new Set());
    }
    if (result.matched.length === 0) {
      toast.warning('Не вдалося знайти жодного учня у вставленому тексті. Перевірте формат відповіді ШІ.');
    } else {
      toast.success(`Розпізнано ${result.matched.length} звітів для учнів`);
    }
  };

  const handleSaveSelected = async () => {
    if (isSaving || !parsedReports) return;
    const chosen = parsedReports.matched.filter((report) => selectedIds.has(report.studentId) && report.content.trim());
    if (!chosen.length) {
      toast.warning('Оберіть учнів із заповненими текстами для збереження.');
      return;
    }
    const reports = chosen.map((report) => buildSavedReport(report.studentId, periodText, report.content.trim()));
    const replacements = reports.filter((report) => db.savedReports?.[report.id]?.content !== undefined && db.savedReports?.[report.id]?.content !== report.content);
    if (replacements.length && !window.confirm(`Замінити ${replacements.length} збережених коментарів за цей період?`)) return;
    setIsSaving(true);
    try {
      const status = await onSaveBatchReports?.(reports);
      if (status !== 'saved') return;
      setSavedIds((previous) => new Set([...previous, ...chosen.map((report) => report.studentId)]));
      toast.success(`Збережено ${reports.length} звітів ✅`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (!parsedReports || !revisionComments.trim()) {
      toast.warning('Додайте коментар щодо потрібних правок.');
      return;
    }
    const chosen = parsedReports.matched.filter((report) => selectedIds.has(report.studentId));
    if (!chosen.length) {
      toast.warning('Оберіть учнів для перегенерації.');
      return;
    }
    setRevisionPrompt(generateBatchRevisionPrompt(chosen, `${periodText} (тривалість: ${describePeriodDuration(startDate, endDate)})`, revisionComments));
    setRevisionTargets(new Set(chosen.map((report) => report.studentId)));
    setImportText('');
    setActiveTab('prompt');
    toast.success(`Промпт для правок ${chosen.length} звітів готовий`);
  };

  const updateReportContent = (studentId: string, content: string) => {
    setParsedReports((current) => current && ({
      ...current,
      matched: current.matched.map((report) => report.studentId === studentId ? { ...report, content } : report),
    }));
    setSavedIds((previous) => new Set([...previous].filter((id) => id !== studentId)));
  };

  const assignUnmatched = (index: number, studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student || !parsedReports) return;
    const block = parsedReports.unmatched[index];
    const remaining = parsedReports.unmatched.filter((_, itemIndex) => itemIndex !== index);
    setParsedReports({
      matched: revisionTargets.has(studentId)
        ? parsedReports.matched.map((report) => report.studentId === studentId ? { ...report, content: block.content } : report)
        : [...parsedReports.matched, { studentId, studentName: student.name, content: block.content }],
      unmatched: remaining,
    });
    setSavedIds((previous) => new Set([...previous].filter((id) => id !== studentId)));
    setSelectedIds((previous) => new Set([...previous, studentId]));
    if (revisionTargets.size && remaining.length === 0) {
      setRevisionTargets(new Set());
      setRevisionPrompt('');
    }
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
                startDate={startDate}
                endDate={endDate}
                onChange={(newText, start, end) => {
                  const next = { text: newText, startDate: start || '', endDate: end || '' };
                  setPeriod(next);
                  saveReportPeriod(next);
                  setParsedReports(null);
                  setRevisionPrompt('');
                  setRevisionTargets(new Set());
                  setSelectedIds(new Set());
                }}
              />
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>У вибірці: <strong className="text-slate-800">{students.length} учнів</strong>, з уроками: <strong>{eligibleCount}</strong></span>
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
              {(revisionPrompt || promptText) && <AiQuickActions prompt={revisionPrompt || promptText} />}
              {revisionPrompt && <button type="button" onClick={() => { setRevisionPrompt(''); setRevisionTargets(new Set()); }} className="text-xs text-indigo-700 hover:underline">Повернутись до загального промпту</button>}

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
              {eligibleCount < students.length && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Учнів без уроків у вибраному періоді не включено до промпту: {students.length - eligibleCount}.</p>}
              {!validDateRange && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Укажіть коректні дати початку й завершення періоду.</p>}
              {validDateRange && !promptText && <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">У вибраному періоді немає уроків для цих учнів. Оберіть інші дати або додайте уроки.</p>}
              {revisionPrompt && <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">Промпт для правок готовий. Скопіюйте його для ШІ, а оновлену відповідь вставте на сусідній вкладці. Попередні тексти залишаться доступними до збереження.</p>}
              <div className="relative">
                {(revisionPrompt || promptText) && <textarea
                  readOnly
                  rows={15}
                  value={revisionPrompt || promptText}
                  className="w-full font-mono text-xs p-4 rounded-xl border border-slate-200 bg-slate-50/90 text-slate-800 focus:outline-none leading-relaxed select-all"
                />}
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
                  if (!revisionTargets.size) {
                    setParsedReports(null);
                    setSavedIds(new Set());
                    setSelectedIds(new Set());
                  }
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

            {revisionTargets.size > 0 && <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">Очікується оновлена відповідь для {revisionTargets.size} обраних учнів. Після розпізнавання заміняться лише їхні тексти.</p>}

            {/* Parsed results preview */}
            {parsedReports && (
              <div className="space-y-4">
                {parsedReports.unmatched.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Не вдалося зіставити {parsedReports.unmatched.length} блок(и) з учнями:</p>
                      <div className="space-y-2">
                        {parsedReports.unmatched.map((block, i) => (
                          <div key={i} className="rounded-lg border border-amber-200 bg-white p-2">
                            <p className="font-semibold">{block.header}</p>
                            <p className="line-clamp-2 whitespace-pre-wrap">{block.content}</p>
                            <select
                              defaultValue=""
                              onChange={(event) => assignUnmatched(i, event.target.value)}
                              aria-label={`Оберіть учня для блоку ${block.header}`}
                              className="mt-2 rounded border border-amber-300 bg-white p-1 text-xs"
                            >
                              <option value="" disabled>Оберіть учня</option>
                              {students.filter((student) => revisionTargets.size ? revisionTargets.has(student.id) : !parsedReports.matched.some((report) => report.studentId === student.id)).map((student) => (
                                <option key={student.id} value={student.id}>{student.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {parsedReports.matched.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        Розпізнано {parsedReports.matched.length} звітів:
                      </p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSelectedIds(new Set(parsedReports.matched.map((report) => report.studentId)))} className="text-xs text-indigo-700 hover:underline">Обрати всіх</button>
                        <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-600 hover:underline">Зняти вибір</button>
                      <button
                        type="button"
                        onClick={handleSaveSelected}
                        disabled={isSaving || selectedIds.size === 0 || [...selectedIds].every((id) => savedIds.has(id))}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Збереження...' : `Зберегти обрані (${selectedIds.size})`}
                      </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <label htmlFor="batch-revision-comments" className="block text-xs font-semibold text-slate-700">Коментар для перегенерації обраних звітів</label>
                      <textarea id="batch-revision-comments" rows={2} value={revisionComments} onChange={(event) => setRevisionComments(event.target.value)} placeholder="Наприклад: коротше, конкретніше опиши труднощі й додай пораду для батьків" className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={handleRegenerate} disabled={!selectedIds.size || !revisionComments.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />Підготувати промпт для правок ({selectedIds.size})</button>
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
                            <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <input type="checkbox" checked={selectedIds.has(r.studentId)} onChange={(event) => setSelectedIds((previous) => {
                                const next = new Set(previous);
                                if (event.target.checked) next.add(r.studentId); else next.delete(r.studentId);
                                return next;
                              })} aria-label={`Обрати звіт для ${r.studentName}`} className="accent-indigo-600" />
                              {savedIds.has(r.studentId) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {r.studentName}
                            </label>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(r.content);
                                  toast.success(`Коментар для ${r.studentName} скопійовано`);
                                } catch {
                                  toast.error('Не вдалося скопіювати коментар');
                                }
                              }}
                              title={`Скопіювати коментар для ${r.studentName}`}
                              aria-label={`Скопіювати коментар для ${r.studentName}`}
                              className="rounded p-1 text-indigo-700 hover:bg-indigo-100"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <textarea value={r.content} onChange={(event) => updateReportContent(r.studentId, event.target.value)} rows={5} aria-label={`Фідбек для ${r.studentName}`} className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          {/(?:\d+(?:[.,]\d+)?\s*(?:\/\s*12|бал(?:ів|и|а)?)|середн(?:ій|ього)\s+бал)/i.test(r.content) && <p className="mt-1 text-amber-700">Перевірте згадку про бали перед збереженням.</p>}
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
              ? `Згенеровано промпт обсягом ${(revisionPrompt || promptText).length} символів`
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
