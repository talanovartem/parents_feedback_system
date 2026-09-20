import React, { useState, useMemo } from 'react';
import { DatabaseSchema, FeedbackMood, StudentLessonFeedback } from '../../types/feedback';
import { evaluateFeedbackQuality } from '../../utils/feedbackAntiSpam';
import { VoiceInputButton } from '../Common/VoiceInputButton';
import { Sparkles, CheckCircle2, ArrowLeft, KeyRound, MessageSquareText, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StudentFeedbackPageProps {
  lessonId: string;
  db: DatabaseSchema;
  onSubmitFeedback: (feedback: StudentLessonFeedback) => void;
}

const MOODS: Array<{ id: FeedbackMood; emoji: string; label: string }> = [
  { id: 'tired', emoji: '😫', label: 'Втомився' },
  { id: 'bored', emoji: '🥱', label: 'Було нудно' },
  { id: 'normal', emoji: '🙂', label: 'Нормально' },
  { id: 'interesting', emoji: '💡', label: 'Цікаво' },
  { id: 'excited', emoji: '🚀', label: 'Захопливо' },
];

const SELF_GRADES = [
  { level: 1, label: 'Потребую допомоги', desc: 'Було важко розібратися самостійно' },
  { level: 2, label: 'Майже все зрозумів(-ла)', desc: 'Залишилися невеликі питання' },
  { level: 3, label: 'Працював(-ла) впевнено', desc: 'Добре засвоїв матеріал уроку' },
  { level: 4, label: 'Можу навчити іншого', desc: 'Тема дуже легка і зрозуміла' },
];

export const StudentFeedbackPage: React.FC<StudentFeedbackPageProps> = ({
  lessonId,
  db,
  onSubmitFeedback,
}) => {
  const lesson = useMemo(() => db.lessons.find((l) => l.id === lessonId), [db.lessons, lessonId]);
  const lessonClass = useMemo(
    () => (lesson ? db.classes.find((c) => c.id === lesson.classId) : undefined),
    [db.classes, lesson]
  );
  const classStudents = useMemo(
    () => (lesson ? db.students.filter((s) => s.classId === lesson.classId) : []),
    [db.students, lesson]
  );

  // Стан вибору учня та PIN
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // Стан полів фідбеку
  const [mood, setMood] = useState<FeedbackMood>('interesting');
  const [selfGrade, setSelfGrade] = useState<number>(3);
  const [insight, setInsight] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [noDifficulty, setNoDifficulty] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Перевірка наявності існуючого фідбеку
  const existingFeedback = useMemo(() => {
    if (!selectedStudentId || !lesson) return undefined;
    return db.lessonFeedback?.[`${selectedStudentId}:${lesson.id}`];
  }, [db.lessonFeedback, selectedStudentId, lesson]);

  if (!lesson || !lessonClass) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <h1 className="text-lg font-bold text-slate-800">Урок не знайдено</h1>
          <p className="text-xs text-slate-500">
            Посилання недійсне або термін уроку завершився. Зверніться до вашого вчителя.
          </p>
          <a
            href="#/schedule"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Повернутися
          </a>
        </div>
      </div>
    );
  }

  // Обробка авторизації учня за PIN
  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    const student = classStudents.find((s) => s.id === selectedStudentId);
    if (!student) {
      toast.error('Будь ласка, оберіть своє ім’я зі списку');
      return;
    }

    if (student.pinCode && pinInput.trim() !== student.pinCode) {
      toast.error('Невірний PIN-код. Спробуйте ще раз або зверніться до вчителя.');
      return;
    }

    // Якщо все вірно або у учня ще не було PIN:
    setIsAuthorized(true);
    if (existingFeedback) {
      setMood(existingFeedback.mood);
      setSelfGrade(existingFeedback.selfGrade);
      setInsight(existingFeedback.insight);
      setDifficulty(existingFeedback.difficulty || '');
      setNoDifficulty(!existingFeedback.difficulty);
    }
  };

  const qualityEvaluation = evaluateFeedbackQuality(insight);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    if (!insight.trim()) {
      toast.error('Будь ласка, напишіть хоча б одне речення про те, чого ви навчилися.');
      return;
    }

    const earnedKarpatiki = !qualityEvaluation.bonusGranted ? 0 : insight.trim().length >= 40 ? 2 : 1;

    const feedbackObj: StudentLessonFeedback = {
      id: `${selectedStudentId}:${lesson.id}`,
      studentId: selectedStudentId,
      lessonId: lesson.id,
      mood,
      selfGrade,
      insight: insight.trim(),
      difficulty: noDifficulty ? undefined : difficulty.trim() || undefined,
      bonusGranted: qualityEvaluation.bonusGranted,
      karpatyPointsEarned: earnedKarpatiki,
      createdAt: new Date().toISOString(),
    };

    onSubmitFeedback(feedbackObj);
    setIsSubmitted(true);
    toast.success(
      earnedKarpatiki > 0
        ? `Відгук збережено! Тобі нараховано +${earnedKarpatiki} Карпатик(и) 🏔️`
        : 'Відгук збережено! Дякуємо за вашу відповідь 👍'
    );
  };

  const currentStudent = classStudents.find((s) => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Шапка з інформацією про урок */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <span>{lessonClass.name}</span>
            <span>•</span>
            <span>Урок №{lesson.lessonNumber}</span>
          </div>
          <h1 className="text-lg font-black text-slate-900 leading-snug">
            {lesson.topic || 'Зворотний зв’язок до уроку'}
          </h1>
          <p className="text-xs text-slate-500">
            Дата: {lesson.date} {lesson.time ? `(${lesson.time})` : ''}
          </p>
        </div>

        {/* Крок 1: Авторизація учня */}
        {!isAuthorized && (
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">Хто ти?</h2>
                <p className="text-[11px] text-slate-500">Обери себе зі списку та введи свій 4-значний PIN</p>
              </div>
            </div>

            <form onSubmit={handleAuthorize} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Твоє прізвище та ім’я *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                >
                  <option value="" disabled>
                    — Обери своє ім’я —
                  </option>
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Твій 4-значний PIN-код *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Наприклад: 1234"
                  required
                  className="w-full text-center tracking-widest text-lg font-mono font-bold px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 PIN-код видає вчитель для захисту твоєї анкети.
                </p>
              </div>

              <button
                type="submit"
                disabled={!selectedStudentId || pinInput.length !== 4}
                className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                Перейти до анкети →
              </button>
            </form>
          </div>
        )}

        {/* Крок 2: Форма фідбеку */}
        {isAuthorized && !isSubmitted && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            {/* 1. Настрій */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>1. Як минув урок для тебе?</span>
                <span className="text-[11px] text-indigo-600 font-semibold">{MOODS.find((m) => m.id === mood)?.label}</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`py-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      mood === m.id
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl select-none">{m.emoji}</span>
                    <span className="text-[9px] font-medium text-slate-600 leading-tight">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Самооцінювання */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                2. Самооцінка моєї роботи на уроці
              </label>
              <div className="space-y-1.5">
                {SELF_GRADES.map((g) => (
                  <button
                    key={g.level}
                    type="button"
                    onClick={() => setSelfGrade(g.level)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                      selfGrade === g.level
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-100 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{g.label}</div>
                      <div className="text-[10px] text-slate-500">{g.desc}</div>
                    </div>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      selfGrade === g.level ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {g.level}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Головний інсайт / чому навчився (для бонусу) */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>3. Чому ти навчився(-лась) на уроці? *</span>
                </label>
                <VoiceInputButton
                  onTranscript={(t) => setInsight((prev) => (prev ? `${prev} ${t}` : t))}
                  size="sm"
                />
              </div>
              <textarea
                rows={3}
                required
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder="Сьогодні я дізнався(-лась), що... або мені найбільше запам'яталося..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed text-slate-800"
              />

              {/* Індикатор бонусу Карпатики */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-400 font-mono">
                  {insight.trim().length} симв. (мін. 15 для бонусу)
                </span>
                {qualityEvaluation.bonusGranted ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    +{insight.trim().length >= 40 ? '2 Карпатики 🏔️🏔️' : '1 Карпатик 🏔️'}
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    {qualityEvaluation.message}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Труднощі (опціонально) */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  <span>4. Що викликало труднощі?</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNoDifficulty(!noDifficulty);
                    if (!noDifficulty) setDifficulty('');
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition ${
                    noDifficulty
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Все було зрозуміло 👍
                </button>
              </div>

              {!noDifficulty && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    placeholder="Наприклад: не до кінця зрозумів формулу або приклад №3..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Вчитель побачить це і зможе пояснити тему на наступному уроці.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <MessageSquareText className="w-4 h-4" />
              <span>
                Надіслати відгук {qualityEvaluation.bonusGranted ? `(+${insight.trim().length >= 40 ? '2' : '1'} Карпатик(и) 🏔️)` : ''}
              </span>
            </button>
          </form>
        )}

        {/* Крок 3: Екран успіху */}
        {isSubmitted && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner text-3xl">
              🏔️
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">
                Дякуємо, {currentStudent?.name.split(' ')[1] || currentStudent?.name}! 🎉
              </h2>
              <p className="text-xs text-slate-500">
                Твій зворотний зв’язок до уроку успішно збережено.
              </p>
            </div>

            {qualityEvaluation.bonusGranted && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>+{insight.trim().length >= 40 ? '2 Карпатики' : '1 Карпатик'} 🏔️ за якісну рефлексію!</span>
                </div>
                <span className="text-[11px] text-amber-700 font-normal">
                  Твій загальний баланс: {(currentStudent?.karpatyPoints || 0) + (insight.trim().length >= 40 ? 2 : 1)} Карпатиків 🏔️
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 pt-2">
              Ти можеш закрити цю вкладку. Успіхів на навчанні!
            </p>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 pt-6">
        Система оцінювання та зворотного зв'язку • НУШ
      </div>
    </div>
  );
};
