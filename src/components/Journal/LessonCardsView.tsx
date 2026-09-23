import React, { useState } from 'react';
import { ScoreInput } from '../ScoreInput';
import { VoiceInputButton } from '../Common/VoiceInputButton';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { calculateStudentAnalytics } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { LessonTableCardProps, LessonViewExtras } from './lessonCardProps';

/** Мобільне подання уроку картками учнів (акордеон без горизонтального скролу). */
export const LessonCardsView: React.FC<LessonTableCardProps & LessonViewExtras> = ({
  lesson,
  students,
  criteria,
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onOpenStudentReport,
  onMarkAllPresent,
  actualExpanded,
  currentViewMode,
  presentCount,
  absentCount,
}) => {
  // Стан розкритих акордеон-карток учнів
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id))
  );

  const toggleStudentCard = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleToggleAllStudentCards = () => {
    if (expandedStudentIds.size === students.length) {
      setExpandedStudentIds(new Set());
    } else {
      setExpandedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  return (
    <>
      {/* Вміст уроку: Мобільний вигляд картками учнів (акордеон) */}
      {actualExpanded && currentViewMode === 'cards' && (
        <div className="p-3.5 sm:p-5 space-y-3 bg-slate-50/50">
          {/* Панель керування картками */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-slate-500">
                Учнів: <strong className="text-slate-800">{students.length}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-500">
                Присутні: <strong className="text-emerald-700">{presentCount}</strong>
              </span>
              {absentCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-medium">
                    Відсутні (Н): <strong>{absentCount}</strong>
                  </span>
                  {onMarkAllPresent && (
                    <button
                      type="button"
                      onClick={() => onMarkAllPresent(lesson.id)}
                      className="ml-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                      title="Позначити всіх учнів присутніми"
                    >
                      (зняти всі Н)
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleAllStudentCards}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
            >
              {expandedStudentIds.size === students.length ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Згорнути всі картки</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Розгорнути всі картки</span>
                </>
              )}
            </button>
          </div>

          {/* Список карток учнів */}
          {students.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200">
              У класі немає учнів.
            </div>
          ) : (
            <div className="space-y-2.5">
              {students.map((student, sIndex) => {
                const analytics = calculateStudentAnalytics(student, db);
                const avgBadge = getScoreBadgeClass(analytics.totalAverage);
                const record = db.records[student.id]?.[lesson.id];
                const isAbsent = !!record?.absent;
                const scores = record?.scores || {};
                const lessonNotes = record?.notes || '';
                const studentFeedback = db.lessonFeedback?.[`${student.id}:${lesson.id}`];
                const isCardExpanded = expandedStudentIds.has(student.id);
                const activeTaskCountCard = (db.attentionTasks || []).filter(
                  (t) => t.studentId === student.id && !t.isCompleted
                ).length;

                // Кількість заповнених критеріїв
                const gradedCount = Object.keys(scores).filter(
                  (k) => scores[k] !== undefined && scores[k] !== null
                ).length;

                return (
                  <div
                    key={student.id}
                    className={`rounded-xl border transition-all overflow-hidden bg-white shadow-2xs ${
                      isAbsent
                        ? 'border-rose-200 bg-rose-50/10'
                        : isCardExpanded
                        ? 'border-indigo-200 ring-1 ring-indigo-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Шапка картки учня (завжди видима) */}
                    <div
                      className={`p-3 sm:p-3.5 flex items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                        isAbsent
                          ? 'bg-rose-50/40 hover:bg-rose-50/60'
                          : isCardExpanded
                          ? 'bg-indigo-50/30 hover:bg-indigo-50/50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => toggleStudentCard(student.id)}
                    >
                      {/* Ліва частина: кнопка Н/П + ПІБ та показники */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleAbsent(student.id, lesson.id);
                          }}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 border ${
                            isAbsent
                              ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={
                            isAbsent
                              ? 'Учень відсутній (Н). Натисніть, щоб зробити присутнім'
                              : 'Учень присутній (П). Натисніть, щоб поставити Н'
                          }
                        >
                          {isAbsent ? 'Н' : 'П'}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm truncate">
                              {student.name}
                            </span>
                            {activeTaskCountCard > 0 && (
                              <span
                                className="cursor-help"
                                title={`${activeTaskCountCard} активне завдання (борг)`}
                              >⚠️</span>
                            )}
                            {student.gender === 'female' ? (
                              <span className="text-xs" title="Дівчина">👧</span>
                            ) : (
                              <span className="text-xs" title="Хлопець">👦</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              Ср. бал:
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${avgBadge}`}>
                                {analytics.totalAverage > 0 ? analytics.totalAverage : '—'}
                              </span>
                            </span>
                            {!isAbsent && (
                              <span className="text-slate-400">
                                • Заповнено: <strong className={gradedCount === criteria.length ? 'text-emerald-700' : 'text-slate-700'}>{gradedCount}/{criteria.length}</strong>
                              </span>
                            )}
                            {lessonNotes && (
                              <span className="text-amber-700 truncate max-w-[140px] font-medium" title={lessonNotes}>
                                • 📝 {lessonNotes}
                              </span>
                            )}
                            {studentFeedback && (
                              <span
                                className="text-purple-700 font-semibold truncate max-w-[150px] flex items-center gap-1 text-[11px]"
                                title={`Фідбек учня: ${studentFeedback.mood === 'excited' ? '🚀 Захопливо' : studentFeedback.mood === 'interesting' ? '💡 Цікаво' : studentFeedback.mood === 'normal' ? '🙂 Нормально' : studentFeedback.mood === 'bored' ? '🥱 Нудно' : '😫 Втомився'}, самооцінка: ${studentFeedback.selfGrade}/4. «${studentFeedback.insight}»`}
                              >
                                • <span>{studentFeedback.mood === 'excited' ? '🚀' : studentFeedback.mood === 'interesting' ? '💡' : studentFeedback.mood === 'normal' ? '🙂' : studentFeedback.mood === 'bored' ? '🥱' : '😫'}</span>
                                <span>{studentFeedback.selfGrade}/4</span>
                                {studentFeedback.bonusGranted && <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Права частина: дії та шеврон розгортання */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={getStudentHash(student.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Відкрити сторінку учня"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => onOpenStudentReport(student)}
                          title="Звіт для батьків та промпт для ШІ"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStudentCard(student.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          aria-label={isCardExpanded ? 'Згорнути картку' : 'Розгорнути картку'}
                        >
                          {isCardExpanded ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Тіло картки (розгорнуте) */}
                    {isCardExpanded && (
                      <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 space-y-3.5">
                        {isAbsent ? (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800">
                            <span className="font-medium">Дитина відсутня на уроці (Н). Оцінювання вимкнено.</span>
                            <button
                              type="button"
                              onClick={() => onToggleAbsent(student.id, lesson.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-white text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-100 transition shadow-2xs"
                            >
                              Позначити присутнім (П)
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Сітка критеріїв оцінювання */}
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Оцінки за критеріями (шкала 0–12)
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {criteria.map((c, cIndex) => {
                                  const score = scores[c.id];
                                  return (
                                    <div
                                      key={c.id}
                                      className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                                    >
                                      <span
                                        className="text-xs font-medium text-slate-700 truncate"
                                        title={c.description || c.name}
                                      >
                                        {c.name}
                                      </span>
                                      <ScoreInput
                                        value={score}
                                        onChange={(newVal) =>
                                          onUpdateScore(student.id, lesson.id, c.id, newVal)
                                        }
                                        disabled={isAbsent}
                                        tableId={`cards-${lesson.id}`}
                                        rowIndex={sIndex}
                                        colIndex={cIndex}
                                        onToggleAbsent={() => onToggleAbsent(student.id, lesson.id)}
                                        ariaLabel={`${student.name} - ${c.name}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Примітки до цього уроку */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                  Примітки до цього уроку
                                </label>
                                <VoiceInputButton
                                  onTranscript={(transcript) => {
                                    const input = document.getElementById(
                                      `card-lesson-notes-${student.id}-${lesson.id}`
                                    ) as HTMLInputElement | null;
                                    if (input) {
                                      const nextVal = input.value
                                        ? `${input.value} ${transcript}`
                                        : transcript;
                                      input.value = nextVal;
                                      onUpdateLessonNotes(student.id, lesson.id, nextVal.trim());
                                    }
                                  }}
                                  size="sm"
                                />
                              </div>
                              <input
                                id={`card-lesson-notes-${student.id}-${lesson.id}`}
                                type="text"
                                defaultValue={lessonNotes}
                                onBlur={(e) =>
                                  onUpdateLessonNotes(student.id, lesson.id, e.target.value.trim())
                                }
                                placeholder="Коментар, активність або спостереження до уроку..."
                                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
                              />
                            </div>

                            {/* Загальні примітки про учня */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Загальні особливості (контекст для ШІ)
                                </label>
                                <VoiceInputButton
                                  onTranscript={(transcript) => {
                                    const input = document.getElementById(
                                      `card-student-notes-${student.id}`
                                    ) as HTMLInputElement | null;
                                    if (input) {
                                      const nextVal = input.value
                                        ? `${input.value} ${transcript}`
                                        : transcript;
                                      input.value = nextVal;
                                      onUpdateStudentNotes(student.id, nextVal.trim());
                                    }
                                  }}
                                  size="sm"
                                />
                              </div>
                              <input
                                id={`card-student-notes-${student.id}`}
                                type="text"
                                defaultValue={student.notes || ''}
                                onBlur={(e) =>
                                  onUpdateStudentNotes(student.id, e.target.value.trim())
                                }
                                placeholder="Особливості дитини, індивідуальний темп..."
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-slate-600"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
  </>
);
};

