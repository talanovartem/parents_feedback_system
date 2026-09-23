import React from 'react';
import { StudentLessonFeedback } from '../../types/feedback';
import { LessonBadgeInfo } from '../../utils/lessonTime';
import { LessonCompletionStatus } from '../../utils/lessonCompletion';
import { toast } from 'sonner';
import { getPublicEntryUrl } from '../../services/publicAccess';
import {
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  Clock,
  CheckCircle2,
  Table,
  LayoutGrid,
  MessageSquareText,
  Edit2,
} from 'lucide-react';
import { LessonTableCardProps, LessonViewExtras } from './lessonCardProps';

export interface LessonCardHeaderProps extends LessonTableCardProps, LessonViewExtras {
  toggleExpand: () => void;
  handleSwitchViewMode: (mode: 'table' | 'cards') => void;
  completion: LessonCompletionStatus;
  badgeInfo: LessonBadgeInfo | null;
  feedbackList: StudentLessonFeedback[];
  setIsEditModalOpen: (open: boolean) => void;
  setIsCopyModalOpen: (open: boolean) => void;
}

/** Шапка картки уроку: дата, номер, бейджі, лічильники та кнопки керування. */
export const LessonCardHeader: React.FC<LessonCardHeaderProps> = ({
  lesson,
  classNameTitle,
  isLatest,
  isNearest,
  students,
  onOpenAddCriterion,
  onDeleteLesson,
  onCopyLessonResults,
  actualExpanded,
  toggleExpand,
  currentViewMode,
  handleSwitchViewMode,
  completion,
  presentCount,
  absentCount,
  badgeInfo,
  feedbackList,
  setIsEditModalOpen,
  setIsCopyModalOpen,
}) => (
  <>
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
                const url = getPublicEntryUrl(`#/feedback/${lesson.id}`);
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
  </>
);
