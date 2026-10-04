import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Lesson } from '../../types/feedback';
import { todayLocalIso } from '../../utils/localDate';
import { getScheduleWeekDates, shiftScheduleDate } from '../../utils/scheduleDates';

interface ScheduleDayPickerProps {
  selectedDate: string | null;
  lessons: Lesson[];
  onSelectDate: (date: string) => void;
  onShowAll: () => void;
}

export function ScheduleDayPicker({ selectedDate, lessons, onSelectDate, onShowAll }: ScheduleDayPickerProps) {
  const today = todayLocalIso();
  const anchorDate = selectedDate ?? today;
  const weekDates = getScheduleWeekDates(anchorDate);
  const lessonCounts = new Map<string, number>();
  for (const lesson of lessons) {
    lessonCounts.set(lesson.date, (lessonCounts.get(lesson.date) ?? 0) + 1);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onSelectDate(today)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
          Сьогодні
        </button>
        <button type="button" onClick={() => onSelectDate(shiftScheduleDate(anchorDate, -1))} aria-label="Попередній день" className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onSelectDate(shiftScheduleDate(anchorDate, 1))} aria-label="Наступний день" className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <CalendarDays className="h-4 w-4" />
          <span className="sr-only">Вибрати дату</span>
          <input type="date" aria-label="Вибрати дату" value={anchorDate} onChange={(event) => event.target.value && onSelectDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" />
        </label>
        <button type="button" onClick={onShowAll} aria-pressed={selectedDate === null} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selectedDate === null ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          Усі уроки
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weekDates.map((date) => {
          const [year, month, day] = date.split('-').map(Number);
          const label = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(new Date(year, month - 1, day));
          const isSelected = date === selectedDate;
          const count = lessonCounts.get(date) ?? 0;
          const lessonWord = count % 10 === 1 && count % 100 !== 11
            ? 'урок'
            : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
              ? 'уроки'
              : 'уроків';
          return (
            <button key={date} type="button" onClick={() => onSelectDate(date)} aria-pressed={isSelected} aria-label={`${label}, ${day}.${String(month).padStart(2, '0')}, ${count} ${lessonWord}`} className={`min-w-14 flex-1 rounded-lg border px-2 py-1.5 text-center text-xs transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}>
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm font-bold">{day}.{String(month).padStart(2, '0')}</span>
              <span className={`block text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>{count} {lessonWord}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
