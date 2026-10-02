import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ClassItem, Lesson } from '../../types/feedback';
import { SaveStatus } from '../../services/storage';
import { NextWeekSuggestion } from '../../utils/nextWeekSchedule';

interface Props {
  suggestions: NextWeekSuggestion[];
  classes: ClassItem[];
  onClose: () => void;
  onCreate: (lessons: Omit<Lesson, 'id'>[]) => Promise<SaveStatus>;
}

export const NextWeekPreviewModal: React.FC<Props> = ({ suggestions, classes, onClose, onCreate }) => {
  const [selected, setSelected] = useState(() => new Set(suggestions.map((item) => item.sourceLessonId)));
  const [busy, setBusy] = useState(false);
  const classNames = new Map(classes.map((item) => [item.id, item.name]));

  const create = async () => {
    const lessons = suggestions.filter((item) => selected.has(item.sourceLessonId)).map(({ sourceLessonId: _source, ...lesson }) => lesson);
    if (lessons.length === 0) {
      toast.error('Оберіть хоча б один урок');
      return;
    }
    setBusy(true);
    try {
      const status = await onCreate(lessons);
      if (status === 'saved') {
        toast.success(`Створено ${lessons.length} уроків наступного тижня`);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="next-week-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
        <div><h2 id="next-week-title" className="text-lg font-bold text-slate-900">Уроки наступного тижня</h2><p className="mt-1 text-sm text-slate-600">Перевірте дати й класи. Теми залишаться порожніми, оцінки не копіюються.</p></div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Закрити попередній перегляд" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><X className="h-5 w-5" /></button>
      </div>
      <div className="overflow-y-auto p-5 space-y-2">
        <div className="flex gap-3 text-xs font-semibold"><button type="button" onClick={() => setSelected(new Set(suggestions.map((item) => item.sourceLessonId)))} className="text-indigo-700 hover:underline">Вибрати всі</button><button type="button" onClick={() => setSelected(new Set())} className="text-slate-600 hover:underline">Очистити</button></div>
        {suggestions.map((item) => <label key={item.sourceLessonId} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
          <input type="checkbox" checked={selected.has(item.sourceLessonId)} onChange={() => setSelected((old) => { const next = new Set(old); if (next.has(item.sourceLessonId)) next.delete(item.sourceLessonId); else next.add(item.sourceLessonId); return next; })} className="accent-indigo-600" />
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{classNames.get(item.classId) || 'Клас'} · урок №{item.lessonNumber}</span>
          <span className="text-xs text-slate-600">{new Date(`${item.date}T12:00:00`).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          {item.time && <span className="text-xs text-slate-500">{item.time}</span>}
        </label>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-5">
        <span className="text-sm text-slate-600">Вибрано: {selected.size} із {suggestions.length}</span>
        <div className="flex gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">Скасувати</button><button type="button" onClick={create} disabled={busy || selected.size === 0} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><CalendarPlus className="h-4 w-4" />{busy ? 'Збереження…' : `Створити ${selected.size} уроків`}</button></div>
      </div>
    </div>
  </div>;
};
