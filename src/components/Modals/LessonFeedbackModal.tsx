import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, MessageSquareText, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Criterion, DatabaseSchema, Lesson, Student, StudentLessonFeedback } from '../../types/feedback';
import { fetchLessonFeedback, getPublicEntryUrl } from '../../services/publicAccess';
import { generateQrSvg } from '../../utils/qrCodeGenerator';
import { getAssessmentRows } from '../../utils/selfAssessment';

interface Props {
  lesson: Lesson;
  students: Student[];
  criteria: Criterion[];
  db: DatabaseSchema;
  initialFeedback: StudentLessonFeedback[];
  onClose: () => void;
}

export const LessonFeedbackModal: React.FC<Props> = ({ lesson, students, criteria, db, initialFeedback, onClose }) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const url = getPublicEntryUrl(`#/feedback/${lesson.id}`);
  const qrSvg = useMemo(() => generateQrSvg(url, 4, 2), [url]);
  const rows = getAssessmentRows(lesson, students, criteria, db, feedback);
  const expected = rows.filter((row) => !row.absent);
  const answered = expected.filter((row) => !!row.feedback).length;
  const gaps = rows.filter((row) => row.needsAttention).length;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const latest = await fetchLessonFeedback(lesson.id);
        if (active) {
          setFeedback(latest);
          setUpdatedAt(new Date());
        }
      } catch {
        // Автооновлення не повинно переривати роботу з уже завантаженими відповідями.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [lesson.id]);

  const refreshNow = async () => {
    setLoading(true);
    try {
      setFeedback(await fetchLessonFeedback(lesson.id));
      setUpdatedAt(new Date());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося оновити відповіді');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Посилання на самооцінку скопійовано');
    } catch {
      window.prompt('Скопіюйте посилання для учнів:', url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lesson-feedback-title" className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 id="lesson-feedback-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><MessageSquareText className="h-5 w-5 text-purple-600" /> Самооцінка наприкінці уроку</h2>
            <p className="mt-1 text-sm text-slate-500">{lesson.date} · Урок №{lesson.lessonNumber}{lesson.topic ? ` · ${lesson.topic}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрити" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[240px_1fr]">
          <section className="space-y-3">
            <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-4" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="text-sm text-slate-600">Покажіть QR-код наприкінці уроку. Учні відкриють форму й увійдуть за своїм PIN-кодом.</p>
            <button type="button" onClick={copyLink} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"><Copy className="h-4 w-4" /> Скопіювати посилання</button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4" /> Перевірити форму</a>
          </section>

          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4">
              <div>
                <p className="text-2xl font-bold text-purple-800">{answered}/{expected.length} <span className="text-sm font-medium">відповіли</span></p>
                <p className="text-xs text-purple-700">Відсутні учні не входять до підрахунку.</p>
              </div>
              <button type="button" onClick={refreshNow} disabled={loading} className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Оновити відповіді</button>
            </div>
            <p className="text-xs text-slate-500">Відповіді оновлюються кожні 15 секунд{updatedAt ? ` · Останнє оновлення: ${updatedAt.toLocaleTimeString('uk-UA')}` : ''}. Для порівняння бал учителя поділено на рівні 0–3, 4–6, 7–9, 10–12. Різниця у 2+ рівні — сигнал для розмови; самооцінка не змінює бал у журналі.</p>
            {gaps > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Потребують уваги: {gaps}</p>}
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.student.id} className={`rounded-xl border p-3 ${row.needsAttention ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{row.student.name}{row.absent && <span className="ml-2 text-xs font-normal text-slate-500">відсутній</span>}</span>
                    {row.feedback ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-purple-100 px-2 py-1 font-semibold text-purple-800">Самооцінка {row.feedback.selfGrade}/4</span>
                        {row.teacherScore !== undefined && <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">Бал {row.teacherScore}/12</span>}
                        {row.needsAttention && <span className="rounded-md bg-amber-100 px-2 py-1 font-semibold text-amber-900">Розбіжність</span>}
                      </div>
                    ) : <span className="text-xs text-slate-400">Ще не відповів(-ла)</span>}
                  </div>
                  {row.feedback && <div className="mt-2 space-y-1 text-xs text-slate-600"><p>Зрозумів(-ла): {row.feedback.insight}</p>{row.feedback.difficulty && <p>Труднощі: {row.feedback.difficulty}</p>}</div>}
                </div>
              ))}
              {rows.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">У цьому класі ще немає учнів.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
