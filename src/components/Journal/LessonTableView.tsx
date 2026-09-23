import React, { useState } from 'react';
import { ScoreCell } from './ScoreCell';
import { VoiceInputButton } from '../Common/VoiceInputButton';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { calculateStudentAnalytics } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';
import { ExternalLink, Sparkles, Edit3 } from 'lucide-react';
import { LessonTableCardProps, LessonViewExtras } from './lessonCardProps';

/** Табличне подвання оцінювання уроку (з клавіатурною навігацією та VoiceInput). */
export const LessonTableView: React.FC<LessonTableCardProps & LessonViewExtras> = ({
  lesson,
  students,
  criteria,
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onOpenStudentReport,
  onBulkFillLessonScore,
  onMarkAllPresent,
  onDeleteCriterion,
  actualExpanded,
  currentViewMode,
  absentCount,
}) => {
  const [editingStudentNotesId, setEditingStudentNotesId] = useState<string | null>(null);
  return (
    <>
      {/* Вміст уроку (Таблиця оцінювання) */}
      {actualExpanded && currentViewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="px-4 py-2.5 min-w-[180px] sm:min-w-[200px] border-r border-slate-200 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                  ПІБ Учня
                </th>
                <th className="px-3 py-2.5 min-w-[160px] border-r border-slate-200">
                  Загальні примітки
                </th>
                <th
                  className="px-1 py-2 text-center min-w-[50px] border-r border-slate-200 font-bold text-indigo-900 bg-indigo-50/50"
                  title="Присутність на уроці (клікніть, щоб поставити Н і заблокувати оцінки)"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Н-ка</span>
                    {absentCount > 0 && onMarkAllPresent && (
                      <button
                        type="button"
                        onClick={() => onMarkAllPresent(lesson.id)}
                        className="text-[9px] font-normal text-indigo-600 hover:text-indigo-800 hover:underline leading-tight"
                        title="Зняти всі Н (позначити всіх присутніми)"
                      >
                        всі П
                      </button>
                    )}
                  </div>
                </th>

                {criteria.map((c) => (
                  <th
                    key={c.id}
                    className="px-1 py-2 text-center min-w-[65px] border-r border-slate-200 font-medium text-[11px] group/th relative"
                    title={c.description || c.name}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-0.5 w-full">
                        <span className="truncate max-w-[65px] font-semibold text-slate-700">{c.name}</span>
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteCriterion(c.id)}
                            title={`Видалити колонку "${c.name}"`}
                            className="text-slate-300 hover:text-rose-600 opacity-0 group-hover/th:opacity-100 transition-opacity ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {onBulkFillLessonScore && (
                        <select
                          className="opacity-0 group-hover/th:opacity-100 focus:opacity-100 text-[9px] bg-white border border-slate-200 rounded px-1 py-0 cursor-pointer text-slate-600 hover:border-indigo-400 transition-opacity"
                          title={`Заповнити бал усім присутнім за критерієм "${c.name}"`}
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') return;
                            const score = val === 'clear' ? null : Number(val);
                            onBulkFillLessonScore(lesson.id, c.id, score);
                            e.target.value = '';
                          }}
                        >
                          <option value="" disabled>Заповнити...</option>
                          <option value="12">Всім 12</option>
                          <option value="11">Всім 11</option>
                          <option value="10">Всім 10</option>
                          <option value="9">Всім 9</option>
                          <option value="8">Всім 8</option>
                          <option value="7">Всім 7</option>
                          <option value="clear">Очистити</option>
                        </select>
                      )}
                    </div>
                  </th>
                ))}

                <th className="px-3 py-2.5 min-w-[200px] font-medium text-[11px] text-slate-600 text-left">
                  Примітки до цього уроку
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + criteria.length + 1}
                    className="px-6 py-6 text-center text-slate-400 italic"
                  >
                    У класі немає учнів.
                  </td>
                </tr>
              ) : (
                students.map((student, sIndex) => {
                  const analytics = calculateStudentAnalytics(student, db);
                  const avgBadge = getScoreBadgeClass(analytics.totalAverage);

                  const record = db.records[student.id]?.[lesson.id];
                  const isAbsent = !!record?.absent;
                  const scores = record?.scores || {};
                  const lessonNotes = record?.notes || '';
                  const studentFeedback = db.lessonFeedback?.[`${student.id}:${lesson.id}`];
                  const activeTaskCount = (db.attentionTasks || []).filter(
                    (t) => t.studentId === student.id && !t.isCompleted
                  ).length;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        isAbsent ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Колонка учня */}
                      <td
                        className={`px-4 py-2 border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] ${
                          isAbsent ? 'bg-rose-50' : 'bg-white group-hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                            <span>{student.name}</span>
                            {activeTaskCount > 0 && (
                              <span
                                className="text-rose-600 flex items-center gap-0.5 cursor-help"
                                title={`${activeTaskCount} активне завдання (борг)`}
                              >
                                ⚠️
                              </span>
                            )}
                            {studentFeedback && (
                              <span
                                className="px-1.5 py-0.2 bg-purple-100 text-purple-800 border border-purple-200 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-help"
                                title={`Фідбек учня: ${studentFeedback.mood === 'excited' ? '🚀 Захопливо' : studentFeedback.mood === 'interesting' ? '💡 Цікаво' : studentFeedback.mood === 'normal' ? '🙂 Нормально' : studentFeedback.mood === 'bored' ? '🥱 Нудно' : '😫 Втомився'}, самооцінка: ${studentFeedback.selfGrade}/4. «${studentFeedback.insight}»`}
                              >
                                <span>{studentFeedback.mood === 'excited' ? '🚀' : studentFeedback.mood === 'interesting' ? '💡' : studentFeedback.mood === 'normal' ? '🙂' : studentFeedback.mood === 'bored' ? '🥱' : '😫'}</span>
                                <span>{studentFeedback.selfGrade}/4</span>
                                {studentFeedback.bonusGranted && <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              title="Середній бал учня за всі уроки"
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${avgBadge}`}
                            >
                              {analytics.totalAverage > 0 ? analytics.totalAverage : '-'}
                            </span>
                            <a
                              href={getStudentHash(student.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Відкрити картку учня в новій вкладці браузера"
                              className="p-1 rounded text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => onOpenStudentReport(student)}
                              title="Звіт для батьків та промпт для ШІ"
                              className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Загальні примітки про особливості дитини */}
                      <td className="px-3 py-2 border-r border-slate-200">
                        {editingStudentNotesId === student.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              id={`student-notes-${student.id}`}
                              type="text"
                              autoFocus
                              defaultValue={student.notes || ''}
                              onBlur={(e) => {
                                onUpdateStudentNotes(student.id, e.target.value.trim());
                                setEditingStudentNotesId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdateStudentNotes(student.id, (e.target as HTMLInputElement).value.trim());
                                  setEditingStudentNotesId(null);
                                }
                              }}
                              className="w-full text-xs px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <VoiceInputButton
                              onTranscript={(transcript) => {
                                const input = document.getElementById(`student-notes-${student.id}`) as HTMLInputElement | null;
                                if (input) {
                                  const nextVal = input.value ? `${input.value} ${transcript}` : transcript;
                                  input.value = nextVal;
                                  onUpdateStudentNotes(student.id, nextVal.trim());
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingStudentNotesId(student.id)}
                            className="cursor-pointer text-slate-500 hover:text-slate-800 truncate max-w-[150px] flex items-center gap-1 text-[11px]"
                            title={student.notes || 'Клікніть, щоб додати примітку'}
                          >
                            <span className="truncate">
                              {student.notes || <span className="text-slate-300 italic">додати...</span>}
                            </span>
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 shrink-0" />
                          </div>
                        )}
                      </td>

                      {/* Н-ка (Присутність) */}
                      <td className={`px-1 py-1 text-center border-r border-slate-200 ${isAbsent ? 'bg-rose-50/50' : ''}`}>
                        <button
                          type="button"
                          onClick={() => onToggleAbsent(student.id, lesson.id)}
                          title={
                            isAbsent
                              ? 'Учень відсутній (Н). Натисніть, щоб зробити присутнім (або клавіша Н)'
                              : 'Учень присутній (П). Натисніть, щоб поставити Н (блокує оцінки, або клавіша Н)'
                          }
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all flex items-center justify-center mx-auto border ${
                            isAbsent
                              ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {isAbsent ? 'Н' : 'П'}
                        </button>
                      </td>

                      {/* Колонки критеріїв (0-12) з клавіатурною навігацією */}
                      {criteria.map((c, cIndex) => (
                        <ScoreCell
                          key={c.id}
                          tableId={lesson.id}
                          rowIndex={sIndex}
                          colIndex={cIndex}
                          onToggleAbsent={() => onToggleAbsent(student.id, lesson.id)}
                          score={isAbsent ? undefined : scores[c.id]}
                          disabled={isAbsent}
                          criterionName={c.name}
                          studentName={student.name}
                          onChange={(newScore) =>
                            onUpdateScore(student.id, lesson.id, c.id, newScore)
                          }
                        />
                      ))}

                      {/* Примітки до цього конкретного уроку */}
                      <td className={`px-2 py-1.5 ${isAbsent ? 'bg-rose-50/20' : ''}`}>
                        <div className="flex items-center gap-1">
                          <input
                            id={`lesson-notes-${student.id}-${lesson.id}`}
                            data-table-id={lesson.id}
                            data-row={sIndex}
                            data-col={criteria.length}
                            type="text"
                            defaultValue={lessonNotes}
                            onBlur={(e) =>
                              onUpdateLessonNotes(student.id, lesson.id, e.target.value.trim())
                            }
                            onKeyDown={(e) => {
                              let targetRow = sIndex;
                              let targetCol = criteria.length;

                              if (e.key === 'ArrowDown' || e.key === 'Enter') {
                                e.preventDefault();
                                onUpdateLessonNotes(student.id, lesson.id, e.currentTarget.value.trim());
                                targetRow += 1;
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                onUpdateLessonNotes(student.id, lesson.id, e.currentTarget.value.trim());
                                targetRow -= 1;
                              } else if (
                                e.key === 'ArrowLeft' &&
                                e.currentTarget.selectionStart === 0 &&
                                e.currentTarget.selectionEnd === 0
                              ) {
                                targetCol -= 1;
                              } else {
                                return;
                              }

                              const nextEl = document.querySelector<HTMLInputElement>(
                                `input[data-table-id="${lesson.id}"][data-row="${targetRow}"][data-col="${targetCol}"]`
                              );
                              if (nextEl) {
                                nextEl.focus();
                                nextEl.select();
                              }
                            }}
                            placeholder={isAbsent ? 'Причина пропуску...' : 'Зауваження до уроку...'}
                            className={`w-full text-[11px] px-2 py-1 border rounded focus:bg-white focus:outline-none transition-colors ${
                              isAbsent
                                ? 'border-rose-200 bg-rose-50/40 text-rose-800 placeholder-rose-300 focus:border-rose-400'
                                : 'border-transparent hover:border-slate-300 focus:border-indigo-400 text-slate-700'
                            }`}
                          />
                          <VoiceInputButton
                            onTranscript={(transcript) => {
                              const input = document.getElementById(
                                `lesson-notes-${student.id}-${lesson.id}`
                              ) as HTMLInputElement | null;
                              if (input) {
                                const nextVal = input.value ? `${input.value} ${transcript}` : transcript;
                                input.value = nextVal;
                                onUpdateLessonNotes(student.id, lesson.id, nextVal.trim());
                              }
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
  </>
);
};

