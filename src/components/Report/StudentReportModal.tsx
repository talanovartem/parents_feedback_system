import React, { useState } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { calculateStudentAnalytics, generateAiPromptForParents } from '../../utils/analytics';
import { filterLessonsByDateRange, getPeriodPresets } from '../../utils/periodHelper';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { AiQuickActions } from './AiQuickActions';
import { PeriodSelector } from './PeriodSelector';
import { X, Sparkles, FileText, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  className: string;
  db: DatabaseSchema;
  onToggleReportSent?: (studentId: string, periodString: string) => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  isOpen,
  onClose,
  student,
  className,
  db,
  onToggleReportSent,
}) => {
  const defaultPreset = getPeriodPresets()[0];
  const [periodText, setPeriodText] = useState(defaultPreset.description);
  const [startDate, setStartDate] = useState<string | undefined>(defaultPreset.startDate);
  const [endDate, setEndDate] = useState<string | undefined>(defaultPreset.endDate);

  if (!isOpen) return null;

  // Фільтруємо уроки саме цього класу
  const classLessons = db.lessons
    .filter((l) => l.classId === student.classId)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Уроки за вибраний діапазон дат
  const matchedLessons = filterLessonsByDateRange(classLessons, startDate, endDate);
  const periodLessons = matchedLessons.length > 0 ? matchedLessons : classLessons;

  const analytics = calculateStudentAnalytics(student, db, periodLessons);
  const aiPrompt = generateAiPromptForParents(analytics, db.criteria, className, periodText);

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

          {/* Промпт для ШІ */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Промпт для ШІ для повідомлення батькам
              </h3>
            </div>

            {/* Вибір періоду */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <PeriodSelector
                value={periodText}
                onChange={(newText, start, end) => {
                  setPeriodText(newText);
                  setStartDate(start);
                  setEndDate(end);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <AiQuickActions prompt={aiPrompt} />

              {onToggleReportSent && (
                <button
                  type="button"
                  onClick={() => onToggleReportSent(student.id, periodText)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition shadow-xs ${
                    db.sentReports?.[`${student.id}:${periodText}`]
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                  title={
                    db.sentReports?.[`${student.id}:${periodText}`]
                      ? 'Звіт позначено як надісланий батькам. Натисніть, щоб скасувати'
                      : 'Натисніть після того, як надішлете текст батькам у месенджер'
                  }
                >
                  {db.sentReports?.[`${student.id}:${periodText}`] ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {db.sentReports?.[`${student.id}:${periodText}`]
                      ? 'Надіслано батькам'
                      : 'Позначити як надіслано'}
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
    </div>
  );
};
