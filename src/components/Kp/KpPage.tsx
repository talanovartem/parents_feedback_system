import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, History, Mountain, RotateCcw, Zap, CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseSchema, KpTransaction } from '../../types/feedback';
import { SaveStatus } from '../../services/storage';
import { calcRecommendedKp, getKpCoverage, getKpPeriodKey, getNetKpAward, getWeekPeriod, hasActiveKpOverlap } from '../../utils/weeklyKp';

interface KpPageProps {
  db: DatabaseSchema;
  onAwardKp: (transactions: Omit<KpTransaction, 'id' | 'createdAt'>[]) => Promise<SaveStatus>;
  onRevokeKp: (studentId: string, period: string) => Promise<SaveStatus>;
}

const dateLabel = (date: string) => date.split('-').reverse().join('.');
const newManualKey = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const KpPage: React.FC<KpPageProps> = ({ db, onAwardKp, onRevokeKp }) => {
  const [selectedClasses, setSelectedClasses] = useState<string[] | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [customDates, setCustomDates] = useState<{ from: string; to: string } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [bulkAmount, setBulkAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'coverage' | 'award' | 'manual' | 'balances' | 'history'>('coverage');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyPeriodOnly, setHistoryPeriodOnly] = useState(false);
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualKey, setManualKey] = useState(newManualKey);
  const [awardPreview, setAwardPreview] = useState<{
    transactions: Omit<KpTransaction, 'id' | 'createdAt'>[];
    skipped: number;
    overlappingStudents: string[];
  } | null>(null);

  const classIds = selectedClasses ?? db.classes.map((item) => item.id);
  const selectedSet = new Set(classIds);
  const week = getWeekPeriod(weekOffset);
  const from = customDates?.from ?? week.monDate;
  const to = customDates?.to ?? week.friDate;
  const validPeriod = !!from && !!to && from <= to;
  const periodKey = getKpPeriodKey(from, to);
  const periodLabel = customDates ? `${dateLabel(from)} – ${dateLabel(to)}` : week.label;
  const classNames = new Map(db.classes.map((item) => [item.id, item.name]));
  const studentsById = new Map(db.students.map((item) => [item.id, item]));
  const coverage = getKpCoverage(db, classIds);
  const missingWeeks = coverage.filter((item) => item.missing > 0 || item.partial > 0).length;

  const recommendations = validPeriod
    ? db.students.filter((student) => selectedSet.has(student.classId)).map((student) => ({
        student,
        ...calcRecommendedKp(student, db, from, to),
      }))
    : [];

  const awardedIds = new Set(db.students.filter((student) =>
    getNetKpAward(db.kpTransactions || [], student.id, periodKey) > 0
  ).map((student) => student.id));
  const blockedIds = new Set(recommendations.filter(({ student }) =>
    hasActiveKpOverlap(db.kpTransactions || [], student.id, periodKey)
  ).map(({ student }) => student.id));
  const pending = recommendations.filter(({ student }) => !blockedIds.has(student.id));
  const awardCount = pending.filter(({ student, total }) => {
    const raw = overrides[student.id];
    const amount = raw === undefined || raw === '' ? total : Number(raw);
    return Number.isInteger(amount) && amount > 0 && amount <= 999;
  }).length;
  const transactions = [...(db.kpTransactions || [])]
    .filter((tx) => selectedSet.has(studentsById.get(tx.studentId)?.classId || ''))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visibleTransactions = transactions.filter((tx) => {
    if (historyPeriodOnly && tx.weekPeriod !== periodKey) return false;
    const studentName = studentsById.get(tx.studentId)?.name || '';
    return `${studentName} ${tx.reason}`.toLocaleLowerCase('uk-UA').includes(historyQuery.toLocaleLowerCase('uk-UA'));
  });
  const totalBalance = db.students.filter((student) => selectedSet.has(student.classId))
    .reduce((sum, student) => sum + (student.karpatyPoints || 0), 0);

  const changePeriod = (offset: number) => {
    setAwardPreview(null);
    setWeekOffset(offset);
    setCustomDates(null);
    setOverrides({});
    setBulkAmount('');
  };

  const changeDate = (field: 'from' | 'to', value: string) => {
    setAwardPreview(null);
    setCustomDates((previous) => ({
      from: field === 'from' ? value : previous?.from ?? week.monDate,
      to: field === 'to' ? value : previous?.to ?? week.friDate,
    }));
    setOverrides({});
    setBulkAmount('');
  };

  const toggleClass = (id: string) => {
    setAwardPreview(null);
    setSelectedClasses((previous) => {
      const current = previous ?? db.classes.map((item) => item.id);
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const prepareAward = () => {
    if (!validPeriod || classIds.length === 0) {
      toast.error('Оберіть класи та коректний проміжок дат');
      return;
    }
    const invalid = pending.some(({ student }) => {
      const raw = overrides[student.id];
      return raw !== undefined && raw !== '' && (!Number.isInteger(Number(raw)) || Number(raw) < 0 || Number(raw) > 999);
    });
    if (invalid) {
      toast.error('KP мають бути цілим числом від 0 до 999');
      return;
    }
    const txs: Omit<KpTransaction, 'id' | 'createdAt'>[] = pending.flatMap(({ student, total }) => {
      const raw = overrides[student.id];
      const amount = raw === undefined || raw === '' ? total : Number(raw);
      return amount > 0 ? [{ studentId: student.id, amount, reason: `Підсумки періоду (${periodLabel})`, weekPeriod: periodKey }] : [];
    });
    if (txs.length === 0) {
      toast.error('Немає нових нарахувань');
      return;
    }
    const overlappingStudents = recommendations.filter(({ student }) => blockedIds.has(student.id) && !awardedIds.has(student.id))
      .map(({ student }) => student.name);
    setAwardPreview({ transactions: txs, skipped: recommendations.length - txs.length, overlappingStudents });
  };

  const award = async () => {
    if (!awardPreview) return;
    if (awardPreview.transactions.some((tx) => hasActiveKpOverlap(db.kpTransactions || [], tx.studentId, periodKey))) {
      setAwardPreview(null);
      toast.error('Нарахування змінилися. Перевірте список ще раз.');
      return;
    }
    setBusy(true);
    try {
      const status = await onAwardKp(awardPreview.transactions);
      if (status === 'saved') {
        toast.success(`KP нараховано ${awardPreview.transactions.length} учням`);
        setOverrides({});
        setAwardPreview(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const awardManual = async () => {
    const amount = Number(manualAmount);
    if (!selectedSet.has(studentsById.get(manualStudentId)?.classId || '') || !Number.isInteger(amount) || amount < 1 || amount > 999 || manualReason.trim().length < 3) {
      toast.error('Оберіть учня, введіть від 1 до 999 KP та причину (щонайменше 3 символи)');
      return;
    }
    setBusy(true);
    try {
      const status = await onAwardKp([{ studentId: manualStudentId, amount, reason: manualReason.trim(), operationKey: manualKey }]);
      if (status === 'saved') {
        toast.success(`${amount} KP нараховано вручну`);
        setManualAmount('');
        setManualReason('');
        setManualKey(newManualKey());
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (studentId: string) => {
    const student = studentsById.get(studentId);
    if (!window.confirm(`Скасувати нарахування за ${periodLabel} для ${student?.name || 'учня'}?`)) return;
    setBusy(true);
    try {
      await onRevokeKp(studentId, periodKey);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700"><Mountain className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Карпатики</span></div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Бонуси KP</h1>
            <p className="mt-1 text-sm text-slate-600">Нарахування за роботу та повна історія бонусів учнів.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-xs text-slate-500">Баланс вибраних класів</div>
            <div className="text-xl font-bold text-amber-700">{totalBalance} KP</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800">Класи</h2>
          <div className="flex gap-2 text-xs font-semibold">
            <button type="button" onClick={() => { setSelectedClasses(db.classes.map((item) => item.id)); setAwardPreview(null); }} className="text-amber-700 hover:underline">Вибрати всі</button>
            <button type="button" onClick={() => { setSelectedClasses([]); setAwardPreview(null); }} className="text-slate-500 hover:underline">Очистити</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Вибір класів">
          {db.classes.map((item) => (
            <label key={item.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${selectedSet.has(item.id) ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-500'}`}>
              <input type="checkbox" checked={selectedSet.has(item.id)} onChange={() => toggleClass(item.id)} className="accent-amber-600" />
              {item.name}
            </label>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Період роботи</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => changePeriod(weekOffset - 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Попередній тиждень"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => changePeriod(0)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${!customDates && weekOffset === 0 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200'}`}>Поточний тиждень</button>
            <button type="button" onClick={() => changePeriod(-1)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${!customDates && weekOffset === -1 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200'}`}>Минулий тиждень</button>
            <button type="button" onClick={() => changePeriod(weekOffset + 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Наступний тиждень"><ChevronRight className="h-4 w-4" /></button>
            <span className="text-xs font-semibold text-slate-600">{periodLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>Інший проміжок:</span>
            <label className="flex items-center gap-1">від <input type="date" value={from} onChange={(event) => changeDate('from', event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" /></label>
            <label className="flex items-center gap-1">до <input type="date" value={to} onChange={(event) => changeDate('to', event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5" /></label>
            {customDates && <button type="button" onClick={() => changePeriod(weekOffset)} className="text-amber-700 hover:underline">Повернути тиждень</button>}
          </div>
          {!validPeriod && <p className="text-xs text-slate-500">Дата початку має бути раніше або дорівнювати даті завершення.</p>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 whitespace-nowrap">
        <button type="button" onClick={() => setTab('coverage')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${tab === 'coverage' ? 'border-b-2 border-amber-600 text-amber-800' : 'text-slate-500'}`}><CalendarDays className="h-4 w-4" />Перевірка періодів {missingWeeks > 0 && <span className="rounded-full bg-rose-100 px-1.5 text-xs text-rose-700">{missingWeeks}</span>}</button>
        <button type="button" onClick={() => setTab('award')} className={`px-4 py-2 text-sm font-semibold ${tab === 'award' ? 'border-b-2 border-amber-600 text-amber-800' : 'text-slate-500'}`}>Нарахування</button>
        <button type="button" onClick={() => setTab('manual')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${tab === 'manual' ? 'border-b-2 border-amber-600 text-amber-800' : 'text-slate-500'}`}><Plus className="h-4 w-4" />Вручну</button>
        <button type="button" onClick={() => setTab('balances')} className={`px-4 py-2 text-sm font-semibold ${tab === 'balances' ? 'border-b-2 border-amber-600 text-amber-800' : 'text-slate-500'}`}>Баланс учнів</button>
        <button type="button" onClick={() => setTab('history')} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${tab === 'history' ? 'border-b-2 border-amber-600 text-amber-800' : 'text-slate-500'}`}><History className="h-4 w-4" />Історія</button>
      </div>

      {tab === 'coverage' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Усі тижні з уроками</h2><p className="mt-1 text-xs text-slate-500">Порожні за результатами тижні теж видно. Зарахованими вважаються бонуси, які покривають усі дні роботи учня. Ручні бонуси є лише в історії.</p></div>
          {coverage.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Для вибраних класів ще немає минулих уроків.</p> : <div className="divide-y divide-slate-100">{coverage.map((item) => <div key={item.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-44 flex-1"><p className="text-sm font-bold text-slate-800">{dateLabel(item.from)} – {dateLabel(item.to)}</p><p className="text-xs text-slate-500">Уроків: {item.lessons} · Учнів із підставами: {item.eligible}</p></div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">{item.eligible === 0 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Немає даних для автоматичного бонусу</span> : <><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Нараховано: {item.awarded}</span>{item.partial > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Частково: {item.partial}</span>}{item.missing > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">Не нараховано: {item.missing}</span>}</>}</div>
            <button type="button" onClick={() => { setCustomDates({ from: item.from, to: item.to }); setOverrides({}); setBulkAmount(''); setAwardPreview(null); setTab('award'); }} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50">Перевірити учнів</button>
          </div>)}</div>}
        </section>
      ) : tab === 'award' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-800">Учнів: {recommendations.length} · готово до нарахування: {awardCount}</span>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">Всім по <input type="number" min="0" max="999" placeholder="KP" aria-label="Кількість KP для всіх" value={bulkAmount} onChange={(event) => {
                setAwardPreview(null);
                setBulkAmount(event.target.value);
                if (event.target.value === '') { setOverrides({}); return; }
                setOverrides(Object.fromEntries(pending.map(({ student }) => [student.id, event.target.value])));
              }} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center" /></label>
              <button type="button" onClick={() => { setOverrides({}); setBulkAmount(''); setAwardPreview(null); }} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" />Рекомендоване</button>
              <button type="button" onClick={prepareAward} disabled={busy || awardCount === 0 || !validPeriod} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"><Zap className="h-3.5 w-3.5" />Перевірити нарахування</button>
            </div>
          </div>
          {awardPreview && <div className="border-b border-amber-200 bg-amber-50 px-4 py-4 text-sm text-slate-800" role="region" aria-label="Перевірка нарахування KP">
            <p className="font-bold">Буде нараховано {awardPreview.transactions.length} учням · {awardPreview.transactions.reduce((sum, tx) => sum + tx.amount, 0)} KP</p>
            <p className="mt-1 text-xs">Період: {periodLabel}. Класи: {db.classes.filter((item) => selectedSet.has(item.id)).map((item) => item.name).join(', ')}. Пропущено: {awardPreview.skipped}.</p>
            {awardPreview.overlappingStudents.length > 0 && <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-800">Заблоковано повторне нарахування для {awardPreview.overlappingStudents.length} учнів через перетин з іншим періодом: {awardPreview.overlappingStudents.join(', ')}. Якщо це окрема робота, додайте бонус вручну з причиною.</p>}
            <div className="mt-3 flex gap-2"><button type="button" onClick={award} disabled={busy} className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-50">Підтвердити нарахування</button><button type="button" onClick={() => setAwardPreview(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Скасувати</button></div>
          </div>}
          {recommendations.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Для вибраних класів і дат учнів немає.</p> : (
            <div className="divide-y divide-slate-100">
              {recommendations.map(({ student, total, breakdown }) => {
                const awarded = awardedIds.has(student.id);
                return <div key={student.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-amber-50/30">
                  <div className="min-w-44 flex-1"><div className="text-sm font-semibold text-slate-800">{student.name} <span className="ml-1 text-xs font-normal text-slate-500">{classNames.get(student.classId)}</span></div><div className="mt-0.5 text-xs text-slate-500">{breakdown.join(', ') || 'Немає рекомендації'}</div></div>
                  <span className="text-xs text-slate-500">Баланс: <b className="text-amber-700">{student.karpatyPoints || 0}</b></span>
                  {awarded ? <button type="button" disabled={busy} onClick={() => revoke(student.id)} className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><Check className="h-3.5 w-3.5" />Нараховано · скасувати</button> : blockedIds.has(student.id) ? <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">Перетин з оплаченим періодом</span> : <label className="flex items-center gap-1 text-xs text-slate-500">KP <input type="number" min="0" max="999" value={overrides[student.id] ?? total} onChange={(event) => { setAwardPreview(null); setOverrides((old) => ({ ...old, [student.id]: event.target.value })); }} className="w-20 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-center font-bold text-amber-900" /></label>}
                </div>;
              })}
            </div>
          )}
        </section>
      ) : tab === 'manual' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Ручний бонус учню</h2><p className="mt-1 text-sm text-slate-600">Для окремої роботи поза підсумками періоду. Вкажіть конкретну причину — вона залишиться в історії.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">Пошук учня<input type="search" value={manualSearch} onChange={(event) => { setManualSearch(event.target.value); setManualStudentId(''); }} placeholder="Ім'я або прізвище" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">Учень<select value={manualStudentId} onChange={(event) => setManualStudentId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Оберіть учня</option>{db.students.filter((student) => selectedSet.has(student.classId) && student.name.toLocaleLowerCase('uk-UA').includes(manualSearch.toLocaleLowerCase('uk-UA'))).map((student) => <option key={student.id} value={student.id}>{student.name} · {classNames.get(student.classId)}</option>)}</select></label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">Кількість KP<input type="number" min="1" max="999" step="1" value={manualAmount} onChange={(event) => setManualAmount(event.target.value)} placeholder="Наприклад, 5" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">Причина<input type="text" maxLength={200} value={manualReason} onChange={(event) => setManualReason(event.target.value)} placeholder="Наприклад, допомога однокласникам" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
          </div>
          <button type="button" onClick={awardManual} disabled={busy} className="mt-5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">{busy ? 'Збереження…' : 'Нарахувати бонус'}</button>
        </section>
      ) : tab === 'balances' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Баланс учнів вибраних класів</div>
          {db.students.filter((student) => selectedSet.has(student.classId)).length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Учнів немає.</p> : <div className="divide-y divide-slate-100">{db.students.filter((student) => selectedSet.has(student.classId)).map((student) => <div key={student.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="flex-1 font-semibold text-slate-800">{student.name}</span>
            <span className="text-xs text-slate-500">{classNames.get(student.classId)}</span>
            <span className="min-w-16 text-right font-bold text-amber-700">{student.karpatyPoints || 0} KP</span>
          </div>)}</div>}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="flex-1 text-sm font-bold text-slate-800">Історія операцій · {visibleTransactions.length}</span>
            <input type="search" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Пошук учня або причини" aria-label="Пошук в історії KP" className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
            <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={historyPeriodOnly} onChange={(event) => setHistoryPeriodOnly(event.target.checked)} className="accent-amber-600" />Лише вибраний період</label>
          </div>
          {visibleTransactions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Нарахувань за цими фільтрами немає.</p> : <div className="divide-y divide-slate-100">{visibleTransactions.map((tx) => {
            const student = studentsById.get(tx.studentId);
            return <div key={tx.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs">
              <span className="min-w-36 font-semibold text-slate-800">{student?.name || 'Видалений учень'} <span className="font-normal text-slate-500">{classNames.get(student?.classId || '')}</span></span>
              <span className="flex-1 text-slate-600">{tx.reason}</span>
              <span className="text-slate-500">{new Date(tx.createdAt).toLocaleDateString('uk-UA')}</span>
              <span className={`min-w-12 text-right font-bold ${tx.amount >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} KP</span>
            </div>;
          })}</div>}
        </section>
      )}
      <p className="text-xs text-slate-500">Нарахування за однаковий період для учня не повторюється. В історії показано всі операції вибраних класів.</p>
    </div>
  );
};
