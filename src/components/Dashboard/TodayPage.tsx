import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, MessageSquareText, Mountain } from 'lucide-react';
import { DatabaseSchema } from '../../types/feedback';
import { todayLocalIso } from '../../utils/localDate';
import { getLessonCompletion } from '../../utils/lessonCompletion';
import { getPeriodPresets } from '../../utils/periodHelper';
import { isReportSent } from '../../utils/savedReports';

interface Props {
  db: DatabaseSchema;
  onSchedule: () => void;
  onJournal: (classId: string) => void;
  onReports: () => void;
  onKp: () => void;
  onTasks: () => void;
}

export function TodayPage({ db, onSchedule, onJournal, onReports, onKp, onTasks }: Props) {
  const today = todayLocalIso();
  const lessons = db.lessons.filter((lesson) => lesson.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.lessonNumber - b.lessonNumber);
  const classes = new Map(db.classes.map((item) => [item.id, item.name]));
  const incomplete = lessons.filter((lesson) => !getLessonCompletion(lesson, db.students.filter((student) => student.classId === lesson.classId), db.records).isFullyGraded);
  const activeTasks = (db.attentionTasks || []).filter((task) => !task.isCompleted);
  const currentPeriod = getPeriodPresets()[0].description;
  const readyReports = Object.values(db.savedReports || {}).filter((report) => report.period === currentPeriod && report.content.trim() && !isReportSent(db, report.studentId, report.period));
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });

  const cards = [
    { title: 'Уроки сьогодні', value: lessons.length, detail: `${incomplete.length} потребують оцінок`, icon: BookOpen, action: onSchedule, actionLabel: 'Відкрити розклад', tone: 'indigo' },
    { title: 'Активні завдання', value: activeTasks.length, detail: 'Борги та питання до уваги', icon: ClipboardList, action: onTasks, actionLabel: 'Переглянути', tone: 'rose' },
    { title: 'Готові повідомлення', value: readyReports.length, detail: 'За поточний тиждень, ще не надіслані', icon: MessageSquareText, action: onReports, actionLabel: 'Скопіювати й надіслати', tone: 'emerald' },
  ] as const;

  return <div className="space-y-6">
    <div className="rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-200">Робочий день · {dateLabel}</p>
      <h1 className="mt-2 text-3xl font-bold">Сьогодні</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-300">Уроки, незаповнені дані та повідомлення батькам в одному місці.</p>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      {cards.map(({ title, value, detail, icon: Icon, action, actionLabel, tone }) => <button key={title} type="button" onClick={action} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
        <div className="flex items-start justify-between"><span className={`rounded-xl p-2.5 ${tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}><Icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" /></div>
        <div className="mt-4 text-3xl font-bold text-slate-900">{value}</div><div className="mt-1 text-sm font-bold text-slate-800">{title}</div><p className="mt-1 text-xs text-slate-500">{detail}</p><p className="mt-4 text-xs font-semibold text-indigo-700">{actionLabel}</p>
      </button>)}
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-bold text-slate-900">Уроки на сьогодні</h2><p className="text-xs text-slate-500">Відкрийте журнал потрібного класу, щоб внести результати.</p></div><button type="button" onClick={onSchedule} className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Повний розклад <ArrowRight className="ml-1 inline h-4 w-4" /></button></div>
      {lessons.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500">На сьогодні уроків немає. Перевірте розклад або створіть урок.</div> : <div className="divide-y divide-slate-100">{lessons.map((lesson) => {
        const completion = getLessonCompletion(lesson, db.students.filter((student) => student.classId === lesson.classId), db.records);
        return <div key={lesson.id} className="flex flex-wrap items-center gap-3 px-5 py-3"><span className="min-w-14 text-sm font-bold text-slate-900">{classes.get(lesson.classId) || 'Клас'}</span><span className="min-w-20 text-xs text-slate-500">{lesson.time || `Урок №${lesson.lessonNumber}`}</span><span className="min-w-36 flex-1 text-sm text-slate-700">{lesson.topic || 'Тему не вказано'}</span><span className={`inline-flex items-center gap-1 text-xs font-semibold ${completion.isFullyGraded ? 'text-emerald-700' : 'text-amber-700'}`}>{completion.isFullyGraded && <CheckCircle2 className="h-4 w-4" />}{completion.isFullyGraded ? 'Заповнено' : `Оцінено ${completion.gradedCount}/${completion.presentCount}`}</span><button type="button" onClick={() => onJournal(lesson.classId)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">Журнал класу</button></div>;
      })}</div>}
    </section>

    <button type="button" onClick={onKp} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"><Mountain className="h-4 w-4" />Перейти до бонусів KP <ArrowRight className="h-4 w-4" /></button>
  </div>;
}
