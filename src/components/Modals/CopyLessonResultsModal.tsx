import React, { useState, useEffect, useMemo } from 'react';
import { Lesson, DatabaseSchema } from '../../types/feedback';
import { Copy, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { getLessonCompletion } from '../../utils/lessonCompletion';
import { toast } from 'sonner';

interface CopyLessonResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLesson: Lesson;
  db: DatabaseSchema;
  onCopyResults: (
    sourceLessonId: string,
    targetLessonId: string,
    options: { copyScores: boolean; copyAttendance: boolean; copyNotes: boolean }
  ) => void;
}

export const CopyLessonResultsModal: React.FC<CopyLessonResultsModalProps> = ({
  isOpen,
  onClose,
  sourceLesson,
  db,
  onCopyResults,
}) => {
  const currentClass = db.classes.find((c) => c.id === sourceLesson.classId);
  const classStudents = db.students.filter((s) => s.classId === sourceLesson.classId);

  // Доступні уроки цього ж класу, окрім поточного (джерела)
  const availableLessons = useMemo(
    () =>
      db.lessons
        .filter((l) => l.classId === sourceLesson.classId && l.id !== sourceLesson.id)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.lessonNumber || 0) - (a.lessonNumber || 0)),
    [db.lessons, sourceLesson.classId, sourceLesson.id]
  );

  const [selectedTargetLessonId, setSelectedTargetLessonId] = useState<string>('');
  const [copyScores, setCopyScores] = useState(true);
  const [copyAttendance, setCopyAttendance] = useState(true);
  const [copyNotes, setCopyNotes] = useState(true);

  useEffect(() => {
    if (availableLessons.length > 0) {
      // За замовчуванням вибираємо перший інший урок (наприклад, спарений того ж дня або найближчий)
      const sameDayLesson = availableLessons.find((l) => l.date === sourceLesson.date);
      setSelectedTargetLessonId(sameDayLesson ? sameDayLesson.id : availableLessons[0].id);
    } else {
      setSelectedTargetLessonId('');
    }
  }, [availableLessons, sourceLesson.date]);

  if (!isOpen) return null;

  const targetLesson = availableLessons.find((l) => l.id === selectedTargetLessonId);
  const targetCompletion = targetLesson
    ? getLessonCompletion(targetLesson, classStudents, db.records)
    : null;
  const hasExistingTargetData = targetCompletion
    ? targetCompletion.gradedCount > 0 || targetCompletion.absentCount > 0
    : false;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetLessonId) {
      toast.error('Оберіть цільовий урок для копіювання');
      return;
    }
    if (!copyScores && !copyAttendance && !copyNotes) {
      toast.error('Будь ласка, оберіть хоча б один тип даних для копіювання');
      return;
    }

    onCopyResults(sourceLesson.id, selectedTargetLessonId, {
      copyScores,
      copyAttendance,
      copyNotes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Заголовок модального вікна */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Копіювання результатів уроку</h3>
              <p className="text-xs text-slate-500">
                Клас {currentClass?.name || ''} • перенесення оцінок та відвідуваності
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {availableLessons.length === 0 ? (
            <div className="p-6 text-center space-y-2 bg-slate-50 rounded-xl border border-slate-200">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Немає інших уроків для цього класу</h4>
              <p className="text-xs text-slate-500">
                Створіть цільовий урок (наприклад, Урок №2 або заняття іншого дня), щоб скопіювати до нього результати.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Закрити
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Відображення звідки і куди копіюємо */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <span>Звідки (поточний урок):</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-950">
                    {sourceLesson.date} • Урок №{sourceLesson.lessonNumber}
                    {sourceLesson.time ? ` (${sourceLesson.time})` : ''}
                  </span>
                </div>
                {sourceLesson.topic && (
                  <p className="text-indigo-800/80 italic truncate">
                    «{sourceLesson.topic}»
                  </p>
                )}
              </div>

              {/* Вибір цільового уроку */}
              <div>
                <label
                  htmlFor="target-lesson-select"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Куди скопіювати результати (цільовий урок):</span>
                </label>
                <select
                  id="target-lesson-select"
                  value={selectedTargetLessonId}
                  onChange={(e) => setSelectedTargetLessonId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableLessons.map((l) => {
                    const isSameDay = l.date === sourceLesson.date;
                    const completion = getLessonCompletion(l, classStudents, db.records);
                    const statusText = completion.isFullyGraded
                      ? 'Заповнено'
                      : completion.isPartiallyGraded
                      ? 'Частково'
                      : 'Порожній';
                    return (
                      <option key={l.id} value={l.id}>
                        {l.date} • Урок №{l.lessonNumber}
                        {l.time ? ` (${l.time})` : ''}
                        {isSameDay ? ' [той самий день]' : ''}
                        {l.topic ? ` — ${l.topic}` : ''} ({statusText})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Попередження про перезапис, якщо в цільовому уроці вже є дані */}
              {hasExistingTargetData && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">У вибраному уроці вже є оцінки або відмітки.</span>
                    <p className="text-amber-800 mt-0.5">
                      Скопійовані дані замінять відповідні оцінки та статуси у вибраному уроці.
                    </p>
                  </div>
                </div>
              )}

              {/* Чекбокси: що саме копіювати */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Оберіть дані для копіювання:
                </span>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={copyScores}
                      onChange={(e) => setCopyScores(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Оцінки за всіма критеріями (шкала 0–12)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={copyAttendance}
                      onChange={(e) => setCopyAttendance(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Відмітки присутності / відсутності («Н»)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={copyNotes}
                      onChange={(e) => setCopyNotes(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Примітки та зауваження до уроку
                    </span>
                  </label>
                </div>
              </div>

              {/* Кнопки дій */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Скопіювати результати</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
