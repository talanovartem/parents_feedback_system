import React, { useState, useMemo } from 'react';
import { StudentLessonFeedback } from '../../types/feedback';
import { EditLessonModal } from '../Modals/EditLessonModal';
import { CopyLessonResultsModal } from '../Modals/CopyLessonResultsModal';
import { getLessonBadgeInfo } from '../../utils/lessonTime';
import { getLessonCompletion, getAttendanceCounts } from '../../utils/lessonCompletion';
import { LessonTableCardProps } from './lessonCardProps';
import { LessonCardHeader } from './LessonCardHeader';
import { LessonTableView } from './LessonTableView';
import { LessonCardsView } from './LessonCardsView';

/**
 * Картка уроку: шапка + табличне / карткове подання оцінювання.
 * Подання винесено в LessonTableView та LessonCardsView.
 */
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const badgeInfo = getLessonBadgeInfo(lesson, !!isNearest);
  const completion = getLessonCompletion(lesson, students, db.records);
  const { presentCount, absentCount } = getAttendanceCounts(lesson, students, db.records);

  // Надіслані учнівські фідбеки до цього уроку
  const feedbackList = useMemo(() => {
    if (!db.lessonFeedback) return [];
    return students
      .map((s) => db.lessonFeedback?.[`${s.id}:${lesson.id}`])
      .filter((f): f is StudentLessonFeedback => !!f);
  }, [db.lessonFeedback, students, lesson.id]);

  const viewExtras = { actualExpanded, currentViewMode, presentCount, absentCount };

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
      <LessonCardHeader
        lesson={lesson}
        classNameTitle={classNameTitle}
        isLatest={isLatest}
        isNearest={isNearest}
        students={students}
        criteria={criteria}
        db={db}
        onUpdateScore={onUpdateScore}
        onToggleAbsent={onToggleAbsent}
        onUpdateLessonNotes={onUpdateLessonNotes}
        onUpdateStudentNotes={onUpdateStudentNotes}
        onDeleteLesson={onDeleteLesson}
        onUpdateLesson={onUpdateLesson}
        onBulkFillLessonScore={onBulkFillLessonScore}
        onMarkAllPresent={onMarkAllPresent}
        onOpenStudentReport={onOpenStudentReport}
        onOpenAddCriterion={onOpenAddCriterion}
        onDeleteCriterion={onDeleteCriterion}
        onCopyLessonResults={onCopyLessonResults}
        {...viewExtras}
        toggleExpand={toggleExpand}
        handleSwitchViewMode={handleSwitchViewMode}
        completion={completion}
        badgeInfo={badgeInfo}
        feedbackList={feedbackList}
        setIsEditModalOpen={setIsEditModalOpen}
        setIsCopyModalOpen={setIsCopyModalOpen}
      />

      <LessonTableView
        lesson={lesson}
        students={students}
        criteria={criteria}
        db={db}
        onUpdateScore={onUpdateScore}
        onToggleAbsent={onToggleAbsent}
        onUpdateLessonNotes={onUpdateLessonNotes}
        onUpdateStudentNotes={onUpdateStudentNotes}
        onDeleteLesson={onDeleteLesson}
        onUpdateLesson={onUpdateLesson}
        onBulkFillLessonScore={onBulkFillLessonScore}
        onMarkAllPresent={onMarkAllPresent}
        onOpenStudentReport={onOpenStudentReport}
        onOpenAddCriterion={onOpenAddCriterion}
        onDeleteCriterion={onDeleteCriterion}
        onCopyLessonResults={onCopyLessonResults}
        isLatest={isLatest}
        {...viewExtras}
      />

      <LessonCardsView
        lesson={lesson}
        students={students}
        criteria={criteria}
        db={db}
        onUpdateScore={onUpdateScore}
        onToggleAbsent={onToggleAbsent}
        onUpdateLessonNotes={onUpdateLessonNotes}
        onUpdateStudentNotes={onUpdateStudentNotes}
        onDeleteLesson={onDeleteLesson}
        onUpdateLesson={onUpdateLesson}
        onBulkFillLessonScore={onBulkFillLessonScore}
        onMarkAllPresent={onMarkAllPresent}
        onOpenStudentReport={onOpenStudentReport}
        onOpenAddCriterion={onOpenAddCriterion}
        onDeleteCriterion={onDeleteCriterion}
        onCopyLessonResults={onCopyLessonResults}
        isLatest={isLatest}
        {...viewExtras}
      />

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

