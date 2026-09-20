import React, { useState } from 'react';
import { Criterion, DatabaseSchema, Lesson, Student } from '../../types/feedback';
import { ScoreCell } from './ScoreCell';
import { EditLessonModal } from '../Modals/EditLessonModal';
import {
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit2,
  Edit3,
  Plus,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { calculateStudentAnalytics } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';

interface LessonTableCardProps {
  lesson: Lesson;
  isLatest: boolean;
  students: Student[];
  criteria: Criterion[];
  db: DatabaseSchema;
  onUpdateScore: (studentId: string, lessonId: string, criterionId: string, score: number | null) => void;
  onToggleAbsent: (studentId: string, lessonId: string) => void;
  onUpdateLessonNotes: (studentId: string, lessonId: string, notes: string) => void;
  onUpdateStudentNotes: (studentId: string, notes: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateLesson: (updated: Lesson) => void;
  onBulkFillLessonScore?: (lessonId: string, criterionId: string, score: number | null) => void;
  onMarkAllPresent?: (lessonId: string) => void;
  onOpenStudentReport: (student: Student) => void;
  onOpenAddCriterion: () => void;
  onDeleteCriterion: (criterionId: string) => void;
}

export const LessonTableCard: React.FC<LessonTableCardProps> = ({
  lesson,
  isLatest,
  students,
  criteria,
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onDeleteLesson,
  onUpdateLesson,
  onBulkFillLessonScore,
  onMarkAllPresent,
  onOpenStudentReport,
  onOpenAddCriterion,
  onDeleteCriterion,
}) => {
  // Найсвіжіший урок за замовчуванням завжди розгорнутий
  const [isExpanded, setIsExpanded] = useState(isLatest);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentNotesId, setEditingStudentNotesId] = useState<string | null>(null);

  // Підрахунок відвідування на уроці
  let presentCount = 0;
  let absentCount = 0;
  for (const s of students) {
    const rec = db.records[s.id]?.[lesson.id];
    if (rec?.absent) {
      absentCount += 1;
    } else {
      presentCount += 1;
    }
  }

  return (
    <div className={`bg-white rounded-2xl border transition-shadow overflow-hidden shadow-xs ${
      isLatest ? 'border-indigo-300 ring-2 ring-indigo-50/70' : 'border-slate-200'
    }`}>
      {/* Шапка картки уроку */}
      <div
        className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none ${
          isLatest ? 'bg-indigo-50/40 border-b border-indigo-100' : 'bg-slate-50/60 border-b border-slate-100'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {lesson.date}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
              Урок №{lesson.lessonNumber}
            </span>
            {lesson.time && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200">
                <Clock className="w-3 h-3 text-slate-500" />
                {lesson.time}
              </span>
            )}
            {isLatest && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                Останній
              </span>
            )}
          </div>

          {lesson.topic ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
              title="Клікніть, щоб редагувати тему уроку"
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium hidden sm:inline truncate max-w-md text-left transition-colors"
            >
              — {lesson.topic}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
              className="text-[11px] text-slate-400 hover:text-indigo-600 italic hidden sm:inline transition-colors"
            >
              — додати тему уроку...
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
          <div className="hidden sm:flex items-center gap-3">
            <span>Присутні: <strong className="text-emerald-700 font-semibold">{presentCount}</strong></span>
            {absentCount > 0 && (
              <span>Відсутні (Н): <strong className="text-rose-600 font-semibold">{absentCount}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAddCriterion}
              title="Додати колонку-критерій"
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              + Колонка
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              title="Редагувати параметри уроку (тему, дату, час)"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDeleteLesson(lesson.id)}
              title="Видалити цей урок"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Вміст уроку (Таблиця оцінювання) */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="px-4 py-2.5 min-w-[200px] border-r border-slate-200">
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

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        isAbsent ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Колонка учня */}
                      <td className="px-4 py-2 border-r border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800 text-xs">
                            {student.name}
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
                          <input
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
                        <input
                          type="text"
                          defaultValue={lessonNotes}
                          onBlur={(e) =>
                            onUpdateLessonNotes(student.id, lesson.id, e.target.value.trim())
                          }
                          placeholder={isAbsent ? 'Причина пропуску...' : 'Зауваження до уроку...'}
                          className={`w-full text-[11px] px-2 py-1 border rounded focus:bg-white focus:outline-none transition-colors ${
                            isAbsent
                              ? 'border-rose-200 bg-rose-50/40 text-rose-800 placeholder-rose-300 focus:border-rose-400'
                              : 'border-transparent hover:border-slate-300 focus:border-indigo-400 text-slate-700'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальне вікно редагування параметрів уроку */}
      <EditLessonModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lesson={lesson}
        onSaveLesson={onUpdateLesson}
      />
    </div>
  );
};
