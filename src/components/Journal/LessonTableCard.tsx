import React, { useState, useMemo } from 'react';
import { Criterion, DatabaseSchema, Lesson, Student } from '../../types/feedback';
import { ScoreCell } from './ScoreCell';
import { ScoreInput } from '../ScoreInput';
import { EditLessonModal } from '../Modals/EditLessonModal';
import { CopyLessonResultsModal } from '../Modals/CopyLessonResultsModal';
import { VoiceInputButton } from '../Common/VoiceInputButton';
import { toast } from 'sonner';
import {
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit2,
  Edit3,
  Plus,
  Copy,
  Clock,
  ExternalLink,
  CheckCircle2,
  Table,
  LayoutGrid,
  MessageSquareText,
} from 'lucide-react';
import { getScoreBadgeClass } from '../../utils/scoreColors';
import { calculateStudentAnalytics } from '../../utils/analytics';
import { getStudentHash } from '../../router/useRouter';
import { getLessonBadgeInfo } from '../../utils/lessonTime';
import { getLessonCompletion } from '../../utils/lessonCompletion';

interface LessonTableCardProps {
  lesson: Lesson;
  classNameTitle?: string;
  isLatest: boolean;
  isNearest?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  viewMode?: 'table' | 'cards';
  onChangeViewMode?: (mode: 'table' | 'cards') => void;
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
  onCopyLessonResults?: (
    sourceLessonId: string,
    targetLessonId: string,
    options: { copyScores: boolean; copyAttendance: boolean; copyNotes: boolean }
  ) => void;
}

export const LessonTableCard: React.FC<LessonTableCardProps> = ({
  lesson,
  classNameTitle,
  isLatest,
  isNearest,
  isExpanded,
  onToggleExpand,
  viewMode,
  onChangeViewMode,
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
  onCopyLessonResults,
}) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  // Якщо стан розгортання передано ззовні — використовуємо його, інакше внутрішній
  const [internalExpanded, setInternalExpanded] = useState(isLatest || !!isNearest);
  const actualExpanded = typeof isExpanded === 'boolean' ? isExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const [internalViewMode, setInternalViewMode] = useState<'table' | 'cards' | null>(null);
  const currentViewMode = internalViewMode || viewMode || 'table';

  const handleSwitchViewMode = (mode: 'table' | 'cards') => {
    setInternalViewMode(mode);
    onChangeViewMode?.(mode);
  };

  // Стан розкритих акордеон-карток учнів у режимі "Картки"
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(() => {
    return new Set(students.map((s) => s.id));
  });

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentNotesId, setEditingStudentNotesId] = useState<string | null>(null);

  const badgeInfo = getLessonBadgeInfo(lesson, !!isNearest);
  const completion = getLessonCompletion(lesson, students, db.records);

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

  // Підрахунок надісланих учнівських фідбеків до цього уроку
  const feedbackList = useMemo(() => {
    if (!db.lessonFeedback) return [];
    return students
      .map((s) => db.lessonFeedback?.[`${s.id}:${lesson.id}`])
      .filter((f): f is import('../../types/feedback').StudentLessonFeedback => !!f);
  }, [db.lessonFeedback, students, lesson.id]);


  return (
    <div
      id={`lesson-card-${lesson.id}`}
      className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs ${
        isNearest
          ? 'border-indigo-400 ring-2 ring-indigo-200/70 shadow-sm'
          : isLatest
          ? 'border-indigo-300 ring-2 ring-indigo-50/70'
          : 'border-slate-200'
      }`}
    >
      {/* Шапка картки уроку */}
      <div
        className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none ${
          isNearest
            ? 'bg-indigo-50/60 border-b border-indigo-100'
            : isLatest
            ? 'bg-indigo-50/40 border-b border-indigo-100'
            : 'bg-slate-50/60 border-b border-slate-100'
        }`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            {actualExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {classNameTitle && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-600 text-white shadow-2xs tracking-wide">
                {classNameTitle}
              </span>
            )}
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {lesson.date}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
              Урок №{lesson.lessonNumber}
            </span>
            {lesson.time && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 flex items-center gap-1 border border-slate-200 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                {lesson.time}
              </span>
            )}
            {badgeInfo && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${badgeInfo.badgeClass}`}>
                {badgeInfo.text}
              </span>
            )}
            {!isNearest && isLatest && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                Останній
              </span>
            )}

            {/* Статус заповнення оцінок */}
            {completion.isFullyGraded ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Заповнено ({completion.gradedCount}/{completion.presentCount})</span>
              </span>
            ) : completion.isPartiallyGraded ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span>Частково ({completion.gradedCount}/{completion.presentCount})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <span>Не заповнено (0/{completion.presentCount})</span>
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
            {/* Перемикач вигляд Таблиця / Картки */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleSwitchViewMode('table')}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition flex items-center gap-1 ${
                  currentViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Перемкнути цей урок на табличний вигляд"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Таблиця</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('cards')}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition flex items-center gap-1 ${
                  currentViewMode === 'cards'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Перемкнути цей урок на вигляд картками учнів (без горизонтального скролу)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Картки</span>
              </button>
            </div>

            {/* Кнопка посилання на фідбек учнів */}
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}${window.location.pathname}#/feedback/${lesson.id}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Посилання на форму фідбеку учнів скопійовано! 📋 Роздайте його класу.');
                } catch {
                  window.prompt('Скопіюйте посилання на форму фідбеку для учнів:', url);
                }
              }}
              title="Скопіювати посилання на форму фідбеку до цього уроку для учнів"
              className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Фідбек учнів</span>
              {feedbackList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-purple-200 text-purple-900 rounded-full text-[10px] font-bold">
                  {feedbackList.length}/{students.length}
                </span>
              )}
            </button>

            <button
              onClick={onOpenAddCriterion}
              title="Додати колонку-критерій"
              className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              + Колонка
            </button>

            {onCopyLessonResults && (
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(true)}
                title="Скопіювати результати (оцінки, відвідуваність, примітки) в інший урок"
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Copy className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="hidden xl:inline">Копіювати результати</span>
                <span className="xl:hidden">Копіювати</span>
              </button>
            )}

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

      {/* Модальне вікно редагування параметрів уроку */}
      <EditLessonModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lesson={lesson}
        onSaveLesson={onUpdateLesson}
      />

      {/* Модальне вікно копіювання результатів уроку */}
      {onCopyLessonResults && isCopyModalOpen && (
        <CopyLessonResultsModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          sourceLesson={lesson}
          db={db}
          onCopyResults={onCopyLessonResults}
        />
      )}
    </div>
  );
};
