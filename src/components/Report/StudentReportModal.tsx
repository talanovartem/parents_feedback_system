import React, { useState } from 'react';
import { DatabaseSchema, SavedReport, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateAiPromptForParents } from '../../utils/analytics';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { buildSavedReport } from '../../utils/reportParser';
import { AiQuickActions } from './AiQuickActions';
import { PeriodSelector } from './PeriodSelector';
import { EditSavedReportModal } from './EditSavedReportModal';
import { X, Sparkles, FileText, Calendar, CheckCircle2, Clock, Save, Pencil, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  className: string;
  db: DatabaseSchema;
  onToggleReportSent?: (studentId: string, periodString: string) => void;
  onSaveSingleReport?: (report: SavedReport) => void;
  onSaveSingleReportContent?: (studentId: string, period: string, content: string) => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  isOpen,
  onClose,
  student,
  className,
  db,
  onToggleReportSent,
  onSaveSingleReport,
  onSaveSingleReportContent,
}) => {
  const defaultPreset = getPeriodPresets()[0];
  const [periodText, setPeriodText] = useState(defaultPreset.description);
  const [startDate, setStartDate] = useState<string | undefined>(defaultPreset.startDate);
  const [endDate, setEndDate] = useState<string | undefined>(defaultPreset.endDate);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!isOpen) return null;

  const reportKey = `${student.id}:${periodText}`;
  const savedReport = db.savedReports?.[reportKey];
  const isSent = !!(savedReport?.sentAt || db.sentReports?.[reportKey]);

  // Фільтруємо уроки саме цього класу
  const classLessons = db.lessons
    .filter((l) => l.classId === student.classId)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Уроки за вибраний діапазон дат
  const matchedLessons = filterLessonsByDateRange(classLessons, startDate, endDate);
  const periodLessons = matchedLessons.length > 0 ? matchedLessons : classLessons;

  const analytics = calculateStudentAnalytics(student, db, periodLessons);
  const aiPrompt = generateAiPromptForParents(analytics, db.criteria, className, periodText);

  const handleSaveImport = () => {
    if (!importText.trim()) return;
    const report = buildSavedReport(student.id, periodText, importText.trim());
    onSaveSingleReport?.(report);
    toast.success('Звіт для батьків збережено ✅');
    setImportText('');
    setShowImport(false);
  };

  const handleCopySaved = async () => {
    if (!savedReport) return;
    try {
      await navigator.clipboard.writeText(savedReport.content);
      toast.success('Текст звіту скопійовано 📋');
    } catch {
      toast.error('Не вдалося скопіювати.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                {className}
              </span>
            </div>
            {student.notes && (
              <p className="text-xs text-slate-500 mt-0.5">Особливості: {student.notes}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Середні оцінки */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Середні показники за {classLessons.length} уроків
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {db.criteria.map((c) => {
                const avg = analytics.averageScores[c.id];
                const badge = getScoreBadgeClass(avg);
                return (
                  <div
                    key={c.id}
                    className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-slate-700">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${badge}`}>
                      {avg !== undefined ? avg : '-'} / 12
                    </span>
                  </div>
                );
              })}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between sm:col-span-2">
                <span className="text-xs font-semibold text-indigo-900">Загальний середній бал:</span>
                <span className="text-sm font-bold text-indigo-700 bg-white px-3 py-0.5 rounded-lg border border-indigo-200">
                  {analytics.totalAverage} / 12
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Відвідування:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${analytics.absentLessonsCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {analytics.attendedLessonsCount}/{analytics.totalLessons} уроків
                </span>
              </div>
            </div>
          </div>

          {/* Поурочні спостереження */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Поурочні примітки та спостереження
            </h3>
            {analytics.lessonNotes.length === 0 ? (
              <p className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                Записів чи зауважень до уроків поки немає
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.lessonNotes.map((n, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 font-medium">
                      <span>
                        {n.lesson.date} (Урок №{n.lesson.lessonNumber})
                      </span>
                      {n.lesson.topic && <span className="text-slate-400">{n.lesson.topic}</span>}
                    </div>
                    <p className="text-slate-800 text-sm font-normal">"{n.notes}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Вибір періоду */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <PeriodSelector
              value={periodText}
              onChange={(newText, start, end) => {
                setPeriodText(newText);
                setStartDate(start);
                setEndDate(end);
                setShowImport(false);
              }}
            />
          </div>

          {/* Збережений звіт ШІ */}
          {savedReport ? (
            <div className="border border-emerald-200 rounded-xl bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Збережений звіт для батьків
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopySaved}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition"
                  >
                    <Copy className="w-3 h-3" />
                    Скопіювати
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                  >
                    <Pencil className="w-3 h-3" />
                    Редагувати
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-emerald-100">
                {savedReport.content}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Оновлено: {new Date(savedReport.updatedAt).toLocaleString('uk-UA')}</span>
                {isSent && <span className="text-emerald-600 font-medium">✓ Надіслано батькам</span>}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                💬 Збережений звіт для цього учня за обраний період відсутній.
                Після отримання відповіді від ШІ — вставте текст нижче і збережіть.
              </p>
              {showImport ? (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Вставте сюди текст, отриманий від ChatGPT / Gemini / Claude..."
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveImport}
                      disabled={!importText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Зберегти звіт
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImport(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-500" />
                  Вставити текст від ШІ і зберегти
                </button>
              )}
            </div>
          )}

          {/* Промпт для ШІ */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Промпт для ШІ для повідомлення батькам
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <AiQuickActions prompt={aiPrompt} />

              {onToggleReportSent && (
                <button
                  type="button"
                  onClick={() => onToggleReportSent(student.id, periodText)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition shadow-xs ${
                    isSent
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                  title={
                    isSent
                      ? 'Звіт позначено як надісланий батькам. Натисніть, щоб скасувати'
                      : 'Натисніть після того, як надішлете текст батькам у месенджер'
                  }
                >
                  {isSent ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {isSent ? 'Надіслано батькам' : 'Позначити як надіслано'}
                  </span>
                </button>
              )}
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-slate-800 shadow-inner">
                {aiPrompt}
              </pre>
            </div>
            <p className="text-[11px] text-slate-400">
              Скористайтесь кнопками вище, щоб скопіювати промпт та одразу перейти до обраного ШІ (ChatGPT, Gemini або Claude).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Оцінки від 0 до 12 підраховуються автоматично
          </span>
          <div className="flex items-center gap-3">
            <AiQuickActions compact prompt={aiPrompt} />
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>

      {/* Вікно редагування збереженого звіту */}
      {savedReport && isEditModalOpen && (
        <EditSavedReportModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          student={student}
          report={savedReport}
          onSave={(content) => {
            onSaveSingleReportContent?.(student.id, periodText, content);
            setIsEditModalOpen(false);
          }}
          onToggleSent={() => onToggleReportSent?.(student.id, periodText)}
        />
      )}
    </div>
  );
};
