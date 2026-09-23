import React, { useState, useMemo } from 'react';
import { DatabaseSchema, KpTransaction, Student } from '../../types/feedback';
import { Mountain, X, Zap, ChevronDown, ChevronUp, History, Check } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyKpModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseSchema;
  onAwardKp: (transactions: Omit<KpTransaction, 'id' | 'createdAt'>[]) => void;
}

function getWeekPeriod(offset: 0 | -1) {
  const now = new Date();
  const day = now.getDay(); // 0=Нд, 1=Пн ...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offset * 7);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const year = fri.getFullYear();
  const weekNum = Math.ceil((((fri.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
  return {
    label: `${fmt(mon)} – ${fmt(fri)}.${fri.getFullYear()}`,
    iso: `${year}-W${String(weekNum).padStart(2, '0')}`,
    monDate: mon.toISOString().slice(0, 10),
    friDate: fri.toISOString().slice(0, 10),
  };
}

/** Розраховує рекомендовану суму KP для учня за тиждень */
function calcRecommendedKp(
  student: Student,
  db: DatabaseSchema,
  monDate: string,
  friDate: string
): { total: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let total = 0;

  // Уроки за тиждень цього класу
  const weekLessons = db.lessons.filter(
    (l) => l.classId === student.classId && l.date >= monDate && l.date <= friDate
  );

  if (weekLessons.length === 0) {
    return { total: 0, breakdown: ['Немає уроків'] };
  }

  // Відвідуваність
  const absents = weekLessons.filter((l) => db.records[student.id]?.[l.id]?.absent).length;
  if (absents === 0) {
    total += 5;
    breakdown.push('+5 (100% відвідуваність)');
  } else if (absents <= 1) {
    total += 2;
    breakdown.push(`+2 (пропуск: ${absents})`);
  }

  // Середній бал за тиждень
  const allScores: number[] = [];
  for (const l of weekLessons) {
    const entry = db.records[student.id]?.[l.id];
    if (entry && !entry.absent) {
      const scores = Object.values(entry.scores || {});
      if (scores.length > 0) {
        allScores.push(...scores);
      }
    }
  }
  if (allScores.length > 0) {
    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    if (avg >= 10) {
      total += 5;
      breakdown.push(`+5 (сер. бал: ${avg.toFixed(1)})`);
    } else if (avg >= 7) {
      total += 3;
      breakdown.push(`+3 (сер. бал: ${avg.toFixed(1)})`);
    } else if (avg >= 4) {
      total += 1;
      breakdown.push(`+1 (сер. бал: ${avg.toFixed(1)})`);
    }
  }

  // Фідбек учня
  const feedbackCount = weekLessons.filter(
    (l) => db.lessonFeedback?.[`${student.id}:${l.id}`]
  ).length;
  if (feedbackCount === weekLessons.length && feedbackCount > 0) {
    total += 2;
    breakdown.push('+2 (всі анкети заповнено)');
  }

  // Без активних боргів
  const hasDebts = (db.attentionTasks || []).some(
    (t) => t.studentId === student.id && !t.isCompleted
  );
  if (!hasDebts && total > 0) {
    total += 1;
    breakdown.push('+1 (без боргів)');
  }

  return { total, breakdown };
}

export const WeeklyKpModal: React.FC<WeeklyKpModalProps> = ({
  isOpen,
  onClose,
  db,
  onAwardKp,
}) => {
  const [weekOffset, setWeekOffset] = useState<0 | -1>(0);
  const [classId, setClassId] = useState<string>(db.classes[0]?.id || '');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  const week = getWeekPeriod(weekOffset);
  const students = db.students.filter((s) => s.classId === classId);

  const recommendations = useMemo(
    () =>
      students.map((s) => {
        const rec = calcRecommendedKp(s, db, week.monDate, week.friDate);
        return { student: s, ...rec };
      }),
    [students, db, week.monDate, week.friDate]
  );

  // Перевірка: чи вже нараховано за цей тиждень для цього класу
  const alreadyAwarded = (studentId: string) =>
    (db.kpTransactions || []).some(
      (t) => t.studentId === studentId && t.weekPeriod === week.iso
    );

  const handleApplyAll = () => {
    const txs: Omit<KpTransaction, 'id' | 'createdAt'>[] = [];
    for (const r of recommendations) {
      if (alreadyAwarded(r.student.id)) continue;
      const raw = overrides[r.student.id];
      const amount = raw !== undefined ? parseInt(raw, 10) : r.total;
      if (isNaN(amount) || amount === 0) continue;
      txs.push({
        studentId: r.student.id,
        amount,
        reason: `Підсумки тижня (${week.label})`,
        weekPeriod: week.iso,
      });
    }
    if (txs.length === 0) {
      toast.error('Немає нових нарахувань');
      return;
    }
    onAwardKp(txs);
    toast.success(`KP нараховано ${txs.length} учням за тиждень ${week.label} 🏔️`);
    onClose();
  };

  const transactions = useMemo(
    () =>
      [...(db.kpTransactions || [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [db.kpTransactions]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Mountain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Нарахування KP 🏔️</h2>
              <p className="text-xs text-slate-500">Карпатики — внутрішня валюта класу</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Налаштування */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          {/* Тиждень */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 text-xs">
            <button
              onClick={() => setWeekOffset(-1)}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${weekOffset === -1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Минулий тиждень
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${weekOffset === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Поточний тиждень
            </button>
          </div>

          {/* Клас */}
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {db.classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <span className="text-xs text-slate-500 ml-auto">{week.label}</span>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-2.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition"
          >
            <History className="w-3.5 h-3.5" />
            Журнал
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Журнал транзакцій */}
        {showHistory && (
          <div className="border-b border-slate-100 bg-slate-50/50 max-h-36 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 text-center">Журнал порожній</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 50).map((t) => {
                  const s = db.students.find((st) => st.id === t.studentId);
                  return (
                    <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-700 font-medium">{s?.name || '—'}</span>
                      <span className="text-slate-500 truncate flex-1 text-center">{t.reason}</span>
                      <span className="font-bold text-amber-700 shrink-0">+{t.amount} 🏔️</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Таблиця учнів */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {recommendations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Учнів не знайдено
            </div>
          ) : (
            recommendations.map(({ student, total, breakdown }) => {
              const awarded = alreadyAwarded(student.id);
              const override = overrides[student.id];
              const displayValue = override !== undefined ? override : String(total);

              return (
                <div
                  key={student.id}
                  className={`px-4 py-3 flex items-center gap-3 ${awarded ? 'opacity-50 bg-slate-50' : 'hover:bg-amber-50/20'} transition`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{student.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{breakdown.join(', ')}</p>
                  </div>
                  <div className="text-xs text-slate-500 text-right shrink-0">
                    <span className="text-[10px]">баланс: </span>
                    <span className="font-bold text-amber-700">{student.karpatyPoints || 0} 🏔️</span>
                  </div>
                  {awarded ? (
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                      <Check className="w-3 h-3" /> Нараховано
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={displayValue}
                        onChange={(e) => setOverrides((o) => ({ ...o, [student.id]: e.target.value }))}
                        className="w-16 text-xs text-center font-bold border border-amber-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50"
                      />
                      <span className="text-xs text-amber-700">🏔️</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Підвал */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              const defaults: Record<string, string> = {};
              recommendations.forEach((r) => {
                if (!alreadyAwarded(r.student.id)) defaults[r.student.id] = String(r.total);
              });
              setOverrides(defaults);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Рекомендоване для всіх
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Закрити
            </button>
            <button
              onClick={handleApplyAll}
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition flex items-center gap-1.5"
            >
              <Mountain className="w-3.5 h-3.5" />
              Нарахувати KP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
