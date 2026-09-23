import React, { useState, useMemo, useEffect } from 'react';
import { DatabaseSchema } from '../../types/feedback';
import { Mountain, AlertCircle, TrendingUp, BookOpen, Calendar, ArrowLeft, QrCode, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { portalLogin } from '../../services/publicAccess';

interface StudentPortalPageProps {
  studentId: string;
  db: DatabaseSchema | null;
  onBack?: () => void;
  /** Публічний вхід (portal.php): дані завантажуються після перевірки коду на сервері */
  publicMode?: boolean;
}

// ─── Компонент входу ──────────────────────────────────────────────────────────

const AccessGate: React.FC<{
  studentId: string;
  db: DatabaseSchema | null;
  publicMode?: boolean;
  onGranted: (scopedDb?: DatabaseSchema | null) => void;
}> = ({ studentId, db, publicMode, onGranted }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const student = db?.students.find((s) => s.id === studentId);

  // Автовхід лише у режимі вчителя (у публічному режимі дані не кешуємо в сесії)
  useEffect(() => {
    if (publicMode) return;
    const stored = sessionStorage.getItem(`portal_access_${studentId}`);
    if (stored === 'granted') onGranted();
  }, [studentId, publicMode, onGranted]);

  const handleSubmit = async () => {
    const trimmed = code.trim();

    if (publicMode) {
      if (trimmed.length !== 6) {
        toast.error('Введіть 6-значний код доступу');
        return;
      }
      setBusy(true);
      try {
        const scoped = await portalLogin(studentId, trimmed);
        onGranted(scoped);
      } catch (e) {
        toast.error(e instanceof Error && e.message ? e.message : 'Невірний код доступу');
      } finally {
        setBusy(false);
      }
      return;
    }

    const expected = student?.accessCode;
    if (!expected) return;
    if (trimmed === expected) {
      sessionStorage.setItem(`portal_access_${studentId}`, 'granted');
      onGranted();
    } else {
      setError(true);
      toast.error('Невірний код доступу');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl p-10 shadow-xl text-center border border-slate-200">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Учня не знайдено</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-slate-200 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Вітаємо!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Введіть ваш особистий код доступу
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="000000"
            className={`w-full text-center text-3xl font-mono font-bold tracking-widest border-2 rounded-xl px-4 py-4 focus:outline-none transition ${
              error
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-slate-200 focus:border-indigo-400 text-slate-900'
            }`}
            autoFocus
            maxLength={6}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={code.length < 6 || busy}
          className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl transition shadow-sm"
        >
          {busy ? 'Перевірка...' : 'Увійти'}
        </button>
        <p className="text-[10px] text-slate-400">
          Код надає вчитель. Він унікальний для кожного учня.
        </p>
      </div>
    </div>
  );
};

// ─── Основний кабінет ─────────────────────────────────────────────────────────

export const StudentPortalPage: React.FC<StudentPortalPageProps> = ({
  studentId,
  db,
  onBack,
  publicMode,
}) => {
  const [publicDb, setPublicDb] = useState<DatabaseSchema | null>(null);
  const [granted, setGranted] = useState(false);
  const effectiveDb = db ?? publicDb;

  if (!granted) {
    return (
      <AccessGate
        studentId={studentId}
        db={effectiveDb}
        publicMode={publicMode}
        onGranted={(scoped) => {
          if (scoped) setPublicDb(scoped);
          setGranted(true);
        }}
      />
    );
  }

  if (!effectiveDb) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Завантаження кабінету...
      </div>
    );
  }

  return <PortalDashboard studentId={studentId} db={effectiveDb} onBack={onBack} />;
};

// ─── Дашборд учня ─────────────────────────────────────────────────────────────

const PortalDashboard: React.FC<{
  studentId: string;
  db: DatabaseSchema;
  onBack?: () => void;
}> = ({ studentId, db, onBack }) => {
  const student = db.students.find((s) => s.id === studentId);
  const cls = student ? db.classes.find((c) => c.id === student.classId) : null;

  const activeTasks = useMemo(
    () => (db.attentionTasks || []).filter((t) => t.studentId === studentId && !t.isCompleted),
    [db.attentionTasks, studentId]
  );

  const lessons = useMemo(
    () => db.lessons.filter((l) => l.classId === student?.classId).sort((a, b) => b.date.localeCompare(a.date)),
    [db.lessons, student?.classId]
  );

  const allScores = useMemo(() => {
    const vals: number[] = [];
    for (const l of lessons) {
      const entry = db.records[studentId]?.[l.id];
      if (entry && !entry.absent) {
        vals.push(...Object.values(entry.scores || {}));
      }
    }
    return vals;
  }, [db.records, lessons, studentId]);

  const avgScore = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : '—';

  const totalLessons = lessons.length;
  const absentCount = lessons.filter((l) => db.records[studentId]?.[l.id]?.absent).length;
  const attendPct = totalLessons > 0 ? Math.round(((totalLessons - absentCount) / totalLessons) * 100) : 100;

  const kpHistory = useMemo(
    () =>
      [...(db.kpTransactions || [])]
        .filter((t) => t.studentId === studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [db.kpTransactions, studentId]
  );

  if (!student) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Учня не знайдено</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100/70">
      {/* Шапка */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Mountain className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{student.name}</h1>
            <p className="text-xs text-slate-500">{cls?.name} · Особистий кабінет</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* KP Баланс */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-5 text-white shadow-md shadow-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80">Баланс Карпатиків</p>
              <p className="text-4xl font-black mt-1">{student.karpatyPoints || 0}</p>
              <p className="text-xs opacity-70 mt-0.5">🏔️ KP — внутрішня валюта класу</p>
            </div>
            <Mountain className="w-14 h-14 opacity-20" />
          </div>
          {kpHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-500/50 space-y-1">
              <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">Останні нарахування</p>
              {kpHistory.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="opacity-80 truncate">{t.reason}</span>
                  <span className="font-bold ml-2">+{t.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Активні завдання */}
        {activeTasks.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-rose-700">Потрібно виконати</h2>
              <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                {activeTasks.length}
              </span>
            </div>
            <div className="divide-y divide-rose-100/50">
              {activeTasks.map((task) => (
                <div key={task.id} className="px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{task.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {task.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <TrendingUp className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xl font-black text-slate-900">{avgScore}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Сер. бал</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <BookOpen className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-black text-slate-900">{attendPct}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Відвідуваність</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <QrCode className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-black text-slate-900">{totalLessons}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Уроків</p>
          </div>
        </div>

        {/* Останні уроки */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800">Останні уроки</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {lessons.slice(0, 10).map((l) => {
              const entry = db.records[studentId]?.[l.id];
              const scores = entry ? Object.values(entry.scores || {}) : [];
              const avg = scores.length > 0
                ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                : null;
              return (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {l.topic || `Урок №${l.lessonNumber}`}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {l.date}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {entry?.absent ? (
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg">Н</span>
                    ) : avg ? (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{avg}</span>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
            {lessons.length === 0 && (
              <p className="px-4 py-6 text-xs text-slate-400 italic text-center">Уроків ще немає</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
