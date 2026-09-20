import React, { useState } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { ScoreCell } from './ScoreCell';
import { Sparkles, Trash2, CalendarPlus, UserPlus, Edit3, Plus } from 'lucide-react';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { calculateStudentAnalytics } from '../../utils/analytics';

interface JournalTableProps {
  currentClassId: string;
  db: DatabaseSchema;
  onUpdateScore: (studentId: string, lessonId: string, criterionId: string, score: number | null) => void;
  onToggleAbsent: (studentId: string, lessonId: string) => void;
  onUpdateLessonNotes: (studentId: string, lessonId: string, notes: string) => void;
  onUpdateStudentNotes: (studentId: string, notes: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onOpenAddLesson: () => void;
  onOpenAddStudent: () => void;
  onOpenStudentReport: (student: Student) => void;
  onOpenAddCriterion: () => void;
  onDeleteCriterion: (criterionId: string) => void;
}

export const JournalTable: React.FC<JournalTableProps> = ({
  currentClassId,
  db,
  onUpdateScore,
  onToggleAbsent,
  onUpdateLessonNotes,
  onUpdateStudentNotes,
  onDeleteStudent,
  onDeleteLesson,
  onOpenAddLesson,
  onOpenAddStudent,
  onOpenStudentReport,
  onOpenAddCriterion,
  onDeleteCriterion,
}) => {
  const [editingStudentNotesId, setEditingStudentNotesId] = useState<string | null>(null);

  // Студенти поточного класу
  const students = db.students.filter((s) => s.classId === currentClassId);

  // Уроки поточного класу, відсортовані за датою
  const lessons = db.lessons
    .filter((l) => l.classId === currentClassId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const criteria = db.criteria;

  if (students.length === 0 && lessons.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <CalendarPlus className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">У цьому класі ще немає даних</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Додайте перших учнів та створіть уроки, щоб почати виставляти поурочні оцінки (0-12) та відмічати присутність.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onOpenAddStudent}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Додати учня
          </button>
          <button
            onClick={onOpenAddLesson}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Створити урок
          </button>
        </div>
      </div>
    );
  }

  // Кількість колонок на один урок: 1 (присутність) + N (критерії) + 1 (примітки)
  const columnsPerLesson = 1 + criteria.length + 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Кнопки швидких дій над таблицею */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Учнів: <strong className="text-slate-800 font-semibold">{students.length}</strong></span>
          <span>Уроків: <strong className="text-slate-800 font-semibold">{lessons.length}</strong></span>
          <span>Колонок діяльності: <strong className="text-slate-800 font-semibold">{criteria.length}</strong></span>
          <span className="hidden md:inline">
            Статус присутності: <span className="font-bold text-emerald-600">П</span> / <span className="font-bold text-rose-600">Н</span> (блокує оцінки)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCriterion}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            title="Додати новий вид діяльності або оцінювану колонку"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            + Колонка (критерій)
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            Додати учня
          </button>
          <button
            onClick={onOpenAddLesson}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Додати урок
          </button>
        </div>
      </div>

      {/* Горизонтально скрольована таблиця */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {/* Рядок 1: Верхні шапки груп (Учень, Загальні примітки, потім уроки) */}
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <th
                rowSpan={2}
                className="sticky left-0 z-30 bg-slate-100 px-4 py-3 min-w-[200px] border-r border-slate-200"
              >
                ПІБ Учня
              </th>
              <th
                rowSpan={2}
                className="sticky left-[200px] z-30 bg-slate-100 px-3 py-3 min-w-[170px] border-r border-slate-200"
              >
                Загальні примітки
              </th>

              {lessons.map((lesson) => (
                <th
                  key={lesson.id}
                  colSpan={columnsPerLesson}
                  className="px-3 py-2 text-center border-r-2 border-slate-300 bg-indigo-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-indigo-950 text-xs">
                      📅 {lesson.date} (Урок №{lesson.lessonNumber})
                    </span>
                    <button
                      onClick={() => onDeleteLesson(lesson.id)}
                      title="Видалити урок"
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-white transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {lesson.topic && (
                    <div className="text-[11px] font-normal text-slate-500 truncate max-w-[260px] text-left mt-0.5">
                      {lesson.topic}
                    </div>
                  )}
                </th>
              ))}
            </tr>

            {/* Рядок 2: Підколонки уроку (Присутність, Критерії, Примітки) */}
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              {lessons.map((lesson) => (
                <React.Fragment key={`sub-${lesson.id}`}>
                  {/* Колонка Присутності */}
                  <th
                    className="px-1 py-1.5 text-center min-w-[42px] border-r border-slate-200 font-bold text-[11px] text-indigo-800 bg-indigo-50/30"
                    title="Присутність на уроці (клікніть, щоб поставити Н)"
                  >
                    Н-ка
                  </th>

                  {/* Оцінювані колонки критеріїв */}
                  {criteria.map((c) => (
                    <th
                      key={`${lesson.id}-${c.id}`}
                      className="px-1.5 py-1.5 text-center min-w-[46px] border-r border-slate-200 font-medium text-[11px] text-slate-600 group/th relative"
                      title={c.description || c.name}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="truncate max-w-[50px]">{c.name}</span>
                        {criteria.length > 1 && (
                          <button
                            onClick={() => onDeleteCriterion(c.id)}
                            title={`Видалити колонку "${c.name}"`}
                            className="text-slate-300 hover:text-rose-600 opacity-0 group-hover/th:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </th>
                  ))}

                  {/* Примітки до уроку */}
                  <th
                    className="px-2 py-1.5 min-w-[150px] border-r-2 border-slate-300 font-medium text-[11px] text-slate-600 text-left"
                    title="Примітки саме до цього уроку"
                  >
                    Примітки до уроку
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + lessons.length * columnsPerLesson}
                  className="px-6 py-8 text-center text-slate-400 italic"
                >
                  У класі поки що немає учнів. Натисніть «Додати учня».
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const analytics = calculateStudentAnalytics(student, db, lessons);
                const avgBadge = getScoreBadgeClass(analytics.totalAverage);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Колонка учня (Sticky) */}
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 px-4 py-2.5 border-r border-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800 text-xs truncate max-w-[130px]">
                            {student.name}
                          </div>
                          {analytics.absentLessonsCount > 0 && (
                            <span className="text-[10px] text-rose-600 font-medium">
                              пропусків: {analytics.absentLessonsCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            title="Середній бал учня за відвідані уроки"
                            className={`px-1.5 py-0.5 rounded text-[10px] border ${avgBadge}`}
                          >
                            {analytics.totalAverage > 0 ? analytics.totalAverage : '-'}
                          </span>
                          <button
                            onClick={() => onOpenStudentReport(student)}
                            title="Звіт для батьків та промпт для ШІ"
                            className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student.id)}
                            title="Видалити учня"
                            className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Загальні примітки до учня (Sticky) */}
                    <td className="sticky left-[200px] z-20 bg-white group-hover:bg-slate-50/90 px-3 py-2 border-r border-slate-200">
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
                              onUpdateStudentNotes(student.id, e.currentTarget.value.trim());
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
                          <span className="truncate">{student.notes || <span className="text-slate-300 italic">додати...</span>}</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* Колонки за уроками */}
                    {lessons.map((lesson) => {
                      const record = db.records[student.id]?.[lesson.id];
                      const isAbsent = !!record?.absent;
                      const scores = record?.scores || {};
                      const lessonNotes = record?.notes || '';

                      return (
                        <React.Fragment key={`${student.id}-${lesson.id}`}>
                          {/* Кнопка відмітки "Н" (Присутність) */}
                          <td className={`px-1 py-1 text-center border-r border-slate-200 ${isAbsent ? 'bg-rose-50/50' : ''}`}>
                            <button
                              type="button"
                              onClick={() => onToggleAbsent(student.id, lesson.id)}
                              title={isAbsent ? 'Учень відсутній (Н). Натисніть, щоб зробити присутнім' : 'Учень присутній (П). Натисніть, щоб поставити Н (блокує оцінки)'}
                              className={`w-7 h-7 rounded-md text-xs font-bold transition-all flex items-center justify-center mx-auto border ${
                                isAbsent
                                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                              }`}
                            >
                              {isAbsent ? 'Н' : 'П'}
                            </button>
                          </td>

                          {/* Критерії уроку (якщо absent — заблоковані!) */}
                          {criteria.map((c) => (
                            <ScoreCell
                              key={`${student.id}-${lesson.id}-${c.id}`}
                              score={isAbsent ? undefined : scores[c.id]}
                              disabled={isAbsent}
                              criterionName={c.name}
                              studentName={student.name}
                              onChange={(newScore) =>
                                onUpdateScore(student.id, lesson.id, c.id, newScore)
                              }
                            />
                          ))}

                          {/* Колонка приміток до конкретного уроку */}
                          <td className={`px-2 py-1.5 border-r-2 border-slate-300 ${isAbsent ? 'bg-rose-50/20' : ''}`}>
                            <input
                              type="text"
                              defaultValue={lessonNotes}
                              onBlur={(e) =>
                                onUpdateLessonNotes(student.id, lesson.id, e.target.value.trim())
                              }
                              placeholder={isAbsent ? 'Причина пропуску...' : 'Зауваження...'}
                              className={`w-full text-[11px] px-2 py-1 border rounded focus:bg-white focus:outline-none transition-colors ${
                                isAbsent
                                  ? 'border-rose-200 bg-rose-50/40 text-rose-800 placeholder-rose-300 focus:border-rose-400'
                                  : 'border-transparent hover:border-slate-300 focus:border-indigo-400 text-slate-700'
                              }`}
                            />
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
