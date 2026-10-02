import React, { useState, useEffect, useRef } from 'react';
import { AttentionTask, DatabaseSchema, KpTransaction, Lesson, Student } from './types/feedback';
import { fetchDatabase, saveDatabase, retryPendingDatabase, inspectServerDatabase, acceptServerDatabase, ServerSnapshot, exportDatabaseToFile, getPendingDatabase, getLastSaveError, getSavedDatabase, hasServerRevision, logout, SaveStatus } from './services/storage';
import { generateAccessCode, generateStudentPin } from './services/migration';
import { validateBackup } from './utils/backupValidation';
import { applyFeedbackToDb } from './utils/feedbackStore';
import { applyCopyLessonResults } from './utils/lessonResults';
import { fillLessonScores } from './utils/bulkScore';
import { isPublicEntry } from './services/publicAccess';
import { PublicEntryNotice } from './components/Common/PublicEntryNotice';
import { JournalTable } from './components/Journal/JournalTable';
import { ManageClassesModal } from './components/Modals/ManageClassesModal';
import { AddStudentModal } from './components/Modals/AddStudentModal';
import { AddLessonModal } from './components/Modals/AddLessonModal';
import { BulkAddLessonsModal } from './components/Modals/BulkAddLessonsModal';
import { ManageCriteriaModal } from './components/Modals/ManageCriteriaModal';
import { StudentReportModal } from './components/Report/StudentReportModal';
import { ReportsOverviewModal } from './components/Report/ReportsOverviewModal';
import { EditStudentModal } from './components/Modals/EditStudentModal';
import { StudentAnalyticsModal } from './components/Report/StudentAnalyticsModal';
import { BatchReportModal } from './components/Report/BatchReportModal';
import { StudentPage } from './components/Student/StudentPage';
import { GlobalDashboard } from './components/Dashboard/GlobalDashboard';
import { TodayPage } from './components/Dashboard/TodayPage';
import { TeacherSchedulePage } from './components/Schedule/TeacherSchedulePage';
import { StudentFeedbackPage } from './components/StudentFeedback/StudentFeedbackPage';
import { StudentPinsModal } from './components/Modals/StudentPinsModal';
import { AttentionTasksModal } from './components/Modals/AttentionTasksModal';
import { ImportBackupModal } from './components/Modals/ImportBackupModal';
import { KpPage } from './components/Kp/KpPage';
import { canAddKpAwards, getNetKpAward } from './utils/weeklyKp';
import { StudentPortalPage } from './components/StudentPortal/StudentPortalPage';
import { useRouter, getClassHash, getScheduleHash, getReportsHash, parseHash } from './router/useRouter';
import { Toaster, toast } from 'sonner';
import {
  GraduationCap,
  Sliders,
  Download,
  Upload,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  Sparkles,
  LogOut,
  BarChart2,
  BookOpen,
  Calendar,
  Cloud,
  CloudOff,
  KeyRound,
  Bell,
  Mountain,
} from 'lucide-react';

export const App: React.FC = () => {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const dbRef = useRef<DatabaseSchema | null>(null);
  const saveIdRef = useRef(0);
  const [pendingDb, setPendingDb] = useState<DatabaseSchema | null>(null);
  const [serverSnapshot, setServerSnapshot] = useState<ServerSnapshot | null>(null);
  const [inspectingServer, setInspectingServer] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'error'>('idle');

  // Модальні вікна
  const [isClassesModalOpen, setIsClassesModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isBulkAddLessonOpen, setIsBulkAddLessonOpen] = useState(false);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [analyticsStudent, setAnalyticsStudent] = useState<Student | null>(null);
  const [batchReportData, setBatchReportData] = useState<{ students: Student[]; groupName: string } | null>(null);
  const [isPinsModalOpen, setIsPinsModalOpen] = useState(false);
  const [isAttentionTasksOpen, setIsAttentionTasksOpen] = useState(false);
  const [importCandidate, setImportCandidate] = useState<{ data: DatabaseSchema; fileName: string } | null>(null);

  const { route, navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const managementMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (managementMenuRef.current && !managementMenuRef.current.contains(event.target as Node)) managementMenuRef.current.open = false;
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, []);

  // Завантаження при старті (у публічному режимі повна база не потрібна —
  // компоненти самі запитують обмежені дані через publicAccess)
  useEffect(() => {
    if (isPublicEntry()) {
      setIsLoading(false);
      return;
    }
    async function init() {
      setIsLoading(true);
      try {
        const data = await fetchDatabase();
        dbRef.current = data;
        setDb(data);
        const pending = getPendingDatabase();
        setPendingDb(pending);
        if (pending) setSaveStatus('error');
        else if (!hasServerRevision()) setSaveStatus('offline');
        if (data.classes.length > 0) {
          // Роут читаємо з поточного hash: ефект виконується лише один раз на старті
          const initialRoute = parseHash(window.location.hash);
          if (initialRoute.name === 'journal' && initialRoute.classId) {
            setSelectedClassId(initialRoute.classId);
          } else {
            setSelectedClassId(data.classes[0].id);
          }
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Не вдалося завантажити базу даних');
      }
      setIsLoading(false);
    }
    init();
  }, []);

  // Синхронізація вибраного класу при зміні роуту
  useEffect(() => {
    if (route.name === 'journal' && route.classId && route.classId !== selectedClassId) {
      setSelectedClassId(route.classId);
    }
  }, [route, selectedClassId]);

  // Оновлення БД зі збереженням
  const updateDbAndSave = async (updater: (prev: DatabaseSchema) => DatabaseSchema, successToast?: string): Promise<SaveStatus> => {
    if (!dbRef.current) return 'offline';
    const updated = updater(dbRef.current);
    dbRef.current = updated;
    setDb(updated);
    const saveId = ++saveIdRef.current;
    setSaveStatus('saving');

    const status = await saveDatabase(updated);
    setPendingDb(getPendingDatabase());
    if (saveId !== saveIdRef.current) return status;
    if (status === 'saved') {
      const saved = getSavedDatabase();
      if (saved) {
        dbRef.current = saved;
        setDb(saved);
      }
      setSaveStatus('saved');
      if (successToast) {
        toast.success(successToast);
      }
      setTimeout(() => {
        if (saveId === saveIdRef.current) setSaveStatus('idle');
      }, 2500);
    } else if (status === 'conflict') {
      setSaveStatus('error');
      toast.error('Те саме поле змінено двічі. Ваші правки залишились у браузері — перегляньте версії перед оновленням сторінки.');
    } else if (status === 'server-error') {
      setSaveStatus('error');
      toast.error(getLastSaveError() || 'Сервер не підтвердив запис. Збережіть локальну копію та перевірте права папки data/.');
    } else if (status === 'unauthorized') {
      setSaveStatus('error');
      toast.error('Сеанс завершено. Увійдіть знову; локальна копія правок збережена.');
    } else {
      setSaveStatus('offline');
      toast.error('Сервер недоступний. Правки збережено у браузері; експортуйте копію перед оновленням сторінки.');
    }
    return status;
  };

  // Дії з оцінками
  const handleUpdateScore = (
    studentId: string,
    lessonId: string,
    criterionId: string,
    score: number | null
  ) => {
    updateDbAndSave((prev) => {
      const records = { ...prev.records };
      const studentRec = { ...(records[studentId] || {}) };
      const lessonEntry = { ...(studentRec[lessonId] || { scores: {}, notes: '' }) };
      const newScores = { ...(lessonEntry.scores || {}) };

      if (score === null) {
        delete newScores[criterionId];
      } else {
        newScores[criterionId] = score;
      }

      lessonEntry.scores = newScores;
      studentRec[lessonId] = lessonEntry;
      records[studentId] = studentRec;

      return { ...prev, records };
    });
  };

  // Перемикання присутності / відсутності ("Н")
  const handleToggleAbsent = (studentId: string, lessonId: string) => {
    let becameAbsent = false;
    updateDbAndSave((prev) => {
      const records = { ...prev.records };
      const studentRec = { ...(records[studentId] || {}) };
      const lessonEntry = { ...(studentRec[lessonId] || { scores: {}, notes: '' }) };

      becameAbsent = !lessonEntry.absent;
      lessonEntry.absent = becameAbsent;

      studentRec[lessonId] = lessonEntry;
      records[studentId] = studentRec;

      return { ...prev, records };
    }, becameAbsent ? 'Поставлено "Н". Оцінки за цей урок заблоковано.' : 'Учня відмічено присутнім.');
  };

  // Дії з поурочними примітками
  const handleUpdateLessonNotes = (studentId: string, lessonId: string, notes: string) => {
    updateDbAndSave((prev) => {
      const records = { ...prev.records };
      const studentRec = { ...(records[studentId] || {}) };
      const lessonEntry = { ...(studentRec[lessonId] || { scores: {}, notes: '' }) };

      lessonEntry.notes = notes;
      studentRec[lessonId] = lessonEntry;
      records[studentId] = studentRec;

      return { ...prev, records };
    }, 'Примітки до уроку збережено');
  };

  // Дії із загальними примітками учня
  const handleUpdateStudentNotes = (studentId: string, notes: string) => {
    updateDbAndSave((prev) => {
      const students = prev.students.map((s) => (s.id === studentId ? { ...s, notes } : s));
      return { ...prev, students };
    }, 'Загальні примітки про учня оновлено');
  };

  // Додавання класу
  const handleAddClass = (name: string) => {
    const newId = `cls-${Date.now()}`;
    updateDbAndSave((prev) => {
      return {
        ...prev,
        classes: [...prev.classes, { id: newId, name }],
      };
    }, `Клас "${name}" успішно додано`);
    setSelectedClassId(newId);
  };

  // Видалення класу
  const handleDeleteClass = (id: string) => {
    const cls = db?.classes.find((c) => c.id === id);
    if (!cls) return;
    if (!window.confirm(`Видалити клас "${cls.name}" та всі його уроки?`)) return;

    updateDbAndSave((prev) => {
      const classes = prev.classes.filter((c) => c.id !== id);
      const students = prev.students.filter((s) => s.classId !== id);
      const lessons = prev.lessons.filter((l) => l.classId !== id);
      return { ...prev, classes, students, lessons };
    }, `Клас "${cls.name}" видалено`);

    if (selectedClassId === id && db?.classes.length) {
      const remaining = db.classes.filter((c) => c.id !== id);
      setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // Додавання учня
  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const usedCodes = new Set((db?.students || []).map((s) => s.accessCode).filter(Boolean));
    let accessCode = generateAccessCode();
    while (usedCodes.has(accessCode)) {
      accessCode = generateAccessCode();
    }
    const id = `std-${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id,
      accessCode,
      // PIN для форми фідбеку: якщо не передано з модалки — генеруємо детермінований
      pinCode: studentData.pinCode || generateStudentPin(id),
    };
    updateDbAndSave((prev) => {
      return {
        ...prev,
        students: [...prev.students, newStudent],
      };
    }, `Учня "${studentData.name}" додано`);
  };

  // Редагування учня
  const handleSaveStudent = (updatedStudent: Student) => {
    updateDbAndSave((prev) => {
      const students = prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
      return { ...prev, students };
    }, `Дані учня "${updatedStudent.name}" оновлено`);
  };

  // Видалення учня (з повним очищенням пов'язаних даних: борги, KP, фідбеки, звіти)
  const handleDeleteStudent = (studentId: string): boolean => {
    const s = db?.students.find((std) => std.id === studentId);
    if (!s) return false;
    if (!window.confirm(`Видалити учня "${s.name}"?`)) return false;

    updateDbAndSave((prev) => {
      const students = prev.students.filter((std) => std.id !== studentId);
      const records = { ...prev.records };
      delete records[studentId];

      const byStudent = <T extends { studentId: string }>(arr: T[] | undefined): T[] | undefined =>
        arr?.filter((t) => t.studentId !== studentId);
      const byKeyPrefix = <T,>(obj: Record<string, T> | undefined): Record<string, T> | undefined => {
        if (!obj) return obj;
        const out: Record<string, T> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (!k.startsWith(`${studentId}:`)) out[k] = v;
        }
        return out;
      };

      return {
        ...prev,
        students,
        records,
        attentionTasks: byStudent(prev.attentionTasks),
        kpTransactions: byStudent(prev.kpTransactions),
        lessonFeedback: byKeyPrefix(prev.lessonFeedback),
        savedReports: byKeyPrefix(prev.savedReports),
        sentReports: byKeyPrefix(prev.sentReports),
      };
    }, `Учня "${s.name}" видалено`);
    return true;
  };

  // Додавання уроку
  const handleAddLesson = (lessonData: Omit<import('./types/feedback').Lesson, 'id'>) => {
    const newLesson: import('./types/feedback').Lesson = {
      ...lessonData,
      id: `les-${Date.now()}`,
    };
    updateDbAndSave((prev) => {
      return {
        ...prev,
        lessons: [...prev.lessons, newLesson],
      };
    }, `Урок від ${lessonData.date} створено`);
  };

  // Масове додавання уроків
  const handleBulkAddLessons = (lessonsData: Omit<import('./types/feedback').Lesson, 'id'>[]) => {
    const timestamp = Date.now();
    const newLessons: import('./types/feedback').Lesson[] = lessonsData.map((data, idx) => ({
      ...data,
      id: `les-${timestamp}-${idx}`,
    }));

    return updateDbAndSave((prev) => {
      return {
        ...prev,
        lessons: [...prev.lessons, ...newLessons],
      };
    }, `Успішно створено ${newLessons.length} нових уроків у класах!`);
  };

  // Видалення уроку
  const handleDeleteLesson = (lessonId: string) => {
    const les = db?.lessons.find((l) => l.id === lessonId);
    if (!les) return;
    if (!window.confirm(`Видалити урок від ${les.date}?`)) return;

    updateDbAndSave((prev) => {
      const lessons = prev.lessons.filter((l) => l.id !== lessonId);
      const records = { ...prev.records };
      // видаляємо записи уроку в усіх учнів
      for (const stdId of Object.keys(records)) {
        if (records[stdId]?.[lessonId]) {
          const studentRec = { ...records[stdId] };
          delete studentRec[lessonId];
          records[stdId] = studentRec;
        }
      }
      return { ...prev, lessons, records };
    }, 'Урок видалено');
  };

  // Оновлення уроку (тема, дата, час, номер)
  const handleUpdateLesson = (updatedLesson: Lesson) => {
    updateDbAndSave((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)),
    }), 'Параметри уроку оновлено');
  };

  // Масове заповнення / очищення оцінок за критерієм для присутніх
  const handleBulkFillLessonScore = (lessonId: string, criterionId: string, score: number | null, onlyEmpty = false) => {
    if (!dbRef.current) return;
    const updated = fillLessonScores(dbRef.current, lessonId, criterionId, score, onlyEmpty);
    if (updated === dbRef.current) {
      toast.info('Немає клітинок для зміни');
      return;
    }
    updateDbAndSave(() => updated, score !== null ? onlyEmpty ? `Бал ${score} додано лише в порожні клітинки` : `Виставлено бал ${score} усім присутнім` : 'Колонку очищено');
  };

  // Зняття "Н" з усіх учнів на уроці
  const handleMarkAllPresent = (lessonId: string) => {
    updateDbAndSave((prev) => {
      const records = { ...prev.records };
      const lesson = prev.lessons.find((l) => l.id === lessonId);
      if (!lesson) return prev;
      const classStudents = prev.students.filter((s) => s.classId === lesson.classId);
      for (const student of classStudents) {
        const studentRec = { ...(records[student.id] || {}) };
        const entry = studentRec[lessonId];
        if (entry?.absent) {
          studentRec[lessonId] = { ...entry, absent: false };
          records[student.id] = studentRec;
        }
      }
      return { ...prev, records };
    }, 'Усіх учнів позначено присутніми');
  };

  // Копіювання результатів уроку (оцінок, відвідуваності, зауважень) в інший урок
  const handleCopyLessonResults = (
    sourceLessonId: string,
    targetLessonId: string,
    options: { copyScores: boolean; copyAttendance: boolean; copyNotes: boolean }
  ) => {
    const targetLesson = db?.lessons.find((l) => l.id === targetLessonId);
    if (!targetLesson) return;

    updateDbAndSave(
      (prev) => applyCopyLessonResults(prev, sourceLessonId, targetLessonId, options),
      `Результати уроку успішно скопійовано до ${targetLesson.date} (Урок №${targetLesson.lessonNumber})! 📋`
    );
  };

  // Позначення або зняття мітки надісланого звіту за період
  const handleToggleReportSent = (studentId: string, periodString: string) => {
    updateDbAndSave((prev) => {
      const sentReports = { ...(prev.sentReports || {}) };
      const savedReports = { ...(prev.savedReports || {}) };
      const key = `${studentId}:${periodString}`;
      if (sentReports[key] || savedReports[key]?.sentAt) {
        delete sentReports[key];
        if (savedReports[key]) {
          savedReports[key] = { ...savedReports[key], sentAt: undefined };
        }
      } else {
        sentReports[key] = new Date().toISOString();
        if (savedReports[key]) {
          savedReports[key] = { ...savedReports[key], sentAt: new Date().toISOString() };
        }
      }
      return { ...prev, sentReports, savedReports };
    });
  };

  // Збереження звіту ШІ для одного учня
  const handleSaveSingleReport = (report: import('./types/feedback').SavedReport) => {
    return updateDbAndSave((prev) => {
      const savedReports = { ...(prev.savedReports || {}) };
      const existing = savedReports[report.id];
      const sentReports = { ...(prev.sentReports || {}) };
      if (existing?.content !== report.content) delete sentReports[report.id];
      savedReports[report.id] = {
        ...report,
        sentAt: existing?.content === report.content ? existing.sentAt : undefined,
      };
      return { ...prev, savedReports, sentReports };
    });
  };

  // Оновлення тексту збереженого звіту
  const handleSaveSingleReportContent = (studentId: string, period: string, content: string) => {
    const key = `${studentId}:${period}`;
    return updateDbAndSave((prev) => {
      const savedReports = { ...(prev.savedReports || {}) };
      const existing = savedReports[key];
      savedReports[key] = {
        ...(existing || { id: key, studentId, period, sentAt: undefined }),
        content,
        updatedAt: new Date().toISOString(),
        sentAt: existing?.content === content ? existing.sentAt : undefined,
      };
      const sentReports = { ...(prev.sentReports || {}) };
      if (existing?.content !== content) delete sentReports[key];
      return { ...prev, savedReports, sentReports };
    });
  };

  // Збереження пакетних звітів ШІ
  const handleSaveBatchReports = (reports: import('./types/feedback').SavedReport[]) => {
    return updateDbAndSave((prev) => {
      const savedReports = { ...(prev.savedReports || {}) };
      const sentReports = { ...(prev.sentReports || {}) };
      for (const r of reports) {
        const existing = savedReports[r.id];
        if (existing?.content !== r.content) delete sentReports[r.id];
        savedReports[r.id] = {
          ...r,
          sentAt: existing?.content === r.content ? existing.sentAt : undefined,
        };
      }
      return { ...prev, savedReports, sentReports };
    });
  };

  // Збереження учнівського фідбеку до уроку та нарахування карпатиків
  // (баланс коригується на різницю балів, транзакція — в історію KP)
  const handleSubmitFeedback = (feedback: import('./types/feedback').StudentLessonFeedback) => {
    updateDbAndSave((prev) => applyFeedbackToDb(prev, feedback), 'Відгук збережено! Карпатики нараховано 🏔️');
  };

  // Оновлення PIN-коду учня
  const handleUpdateStudentPin = (studentId: string, newPin: string) => {
    updateDbAndSave((prev) => {
      const students = prev.students.map((s) => (s.id === studentId ? { ...s, pinCode: newPin } : s));
      return { ...prev, students };
    });
  };

  // Додавання важливого завдання / боргу учня
  const handleAddAttentionTask = (task: Omit<AttentionTask, 'id' | 'createdAt'>) => {
    const newTask: AttentionTask = {
      ...task,
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    updateDbAndSave((prev) => ({
      ...prev,
      attentionTasks: [...(prev.attentionTasks || []), newTask],
    }));
  };

  // Позначення завдання виконаним
  const handleCompleteAttentionTask = (taskId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      attentionTasks: (prev.attentionTasks || []).map((t) =>
        t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t
      ),
    }));
  };

  // Нарахування KP балів за вибраний період
  const handleAwardKp = (transactions: Omit<KpTransaction, 'id' | 'createdAt'>[]) => {
    if (!dbRef.current || !canAddKpAwards(dbRef.current, transactions)) {
      toast.error('Повторне або некоректне нарахування заблоковано. Оновіть перевірку перед збереженням.');
      return Promise.resolve('conflict' as SaveStatus);
    }
    return updateDbAndSave((prev) => {
      const newTxs: KpTransaction[] = transactions.map((tx) => ({
        ...tx,
        id: `kp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        createdAt: new Date().toISOString(),
      }));
      // Оновлюємо баланс учнів
      const studentUpdates: Record<string, number> = {};
      for (const tx of newTxs) {
        studentUpdates[tx.studentId] = (studentUpdates[tx.studentId] || 0) + tx.amount;
      }
      const students = prev.students.map((s) =>
        studentUpdates[s.id] !== undefined
          ? { ...s, karpatyPoints: (s.karpatyPoints || 0) + studentUpdates[s.id] }
          : s
      );
      return {
        ...prev,
        kpTransactions: [...(prev.kpTransactions || []), ...newTxs],
        students,
      };
    });
  };

  // Скасування нарахування за період
  const handleRevokeWeeklyKp = (studentId: string, weekPeriod: string) => {
    return updateDbAndSave((prev) => {
      const txs = prev.kpTransactions || [];
      const amount = getNetKpAward(txs, studentId, weekPeriod);
      if (amount <= 0) return prev;
      const students = prev.students.map((s) =>
        s.id === studentId
          ? { ...s, karpatyPoints: (s.karpatyPoints || 0) - amount }
          : s
      );
      return {
        ...prev,
        students,
        kpTransactions: [...txs, {
          id: `kp-revoke-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          studentId,
          weekPeriod,
          amount: -amount,
          reason: `Скасування нарахування за ${weekPeriod}`,
          createdAt: new Date().toISOString(),
        }],
      };
    }, 'Нарахування за період скасовано');
  };


  // Додавання критерію
  const handleAddCriterion = (name: string, description?: string) => {
    const id = `crit-${Date.now()}`;
    updateDbAndSave((prev) => {
      return {
        ...prev,
        criteria: [...prev.criteria, { id, name, description }],
      };
    }, `Критерій "${name}" додано`);
  };

  // Видалення критерію
  const handleDeleteCriterion = (id: string) => {
    const crit = db?.criteria.find((c) => c.id === id);
    if (!crit) return;
    if (!window.confirm(`Видалити критерій "${crit.name}"?`)) return;

    updateDbAndSave((prev) => {
      const criteria = prev.criteria.filter((c) => c.id !== id);
      return { ...prev, criteria };
    }, `Критерій "${crit.name}" видалено`);
  };

  // Експорт та імпорт JSON
  const handleExportJson = () => {
    if (db) {
      exportDatabaseToFile(db);
      toast.success('Резервну копію JSON успішно збережено');
    }
  };

  const handleRetryPending = async () => {
    const pending = getPendingDatabase();
    if (!pending) return;
    setSaveStatus('saving');
    const status = await retryPendingDatabase();
    setPendingDb(getPendingDatabase());
    if (status === 'saved') {
      const saved = getSavedDatabase() ?? pending;
      dbRef.current = saved;
      setDb(saved);
      setSaveStatus('saved');
      toast.success('Незбережені правки записано на сервер');
    } else {
      setSaveStatus('error');
      toast.error(status === 'conflict'
        ? 'На сервері вже інша версія. Збережіть локальну копію JSON перед відновленням.'
        : 'Повторний запис не вдався. Перевірте з’єднання й спробуйте ще раз.');
    }
  };

  const handleInspectServer = async () => {
    setInspectingServer(true);
    try {
      setServerSnapshot(await inspectServerDatabase());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося прочитати серверну версію');
    } finally {
      setInspectingServer(false);
    }
  };

  const handleAcceptServer = () => {
    if (!serverSnapshot || saveStatus === 'saving') return;
    const pending = getPendingDatabase();
    if (pending) exportDatabaseToFile(pending, 'parents_feedback_unsynced');
    acceptServerDatabase(serverSnapshot);
    dbRef.current = serverSnapshot.data;
    setDb(serverSnapshot.data);
    setSelectedClassId((current) => serverSnapshot.data.classes.some((item) => item.id === current) ? current : serverSnapshot.data.classes[0]?.id || '');
    setPendingDb(null);
    setSaveStatus('saved');
    setServerSnapshot(null);
    toast.success('Завантажено серверну версію. Локальні правки збережено у JSON-файлі.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setImportCandidate({ data: validateBackup(parsed), fileName: file.name });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Помилка зчитування JSON-файлу');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Публічний вхід (portal.php / ?public=1): повна база НЕ вантажиться,
  // доступні лише маршрут учнівського порталу та форма фідбеку
  if (isPublicEntry()) {
    if (route.name === 'student-portal') {
      return (
        <>
          <Toaster position="top-right" richColors />
          <StudentPortalPage
            studentId={route.studentId}
            db={null}
            publicMode
          />
        </>
      );
    }
    if (route.name === 'feedback') {
      return (
        <>
          <Toaster position="top-right" richColors />
          <StudentFeedbackPage
            lessonId={route.lessonId}
            db={null}
            publicMode
            onSubmitFeedback={handleSubmitFeedback}
          />
        </>
      );
    }
    return (
      <>
        <Toaster position="top-right" richColors />
        <PublicEntryNotice />
      </>
    );
  }

  if (isLoading || !db) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        {isLoading ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /> : <AlertCircle className="w-8 h-8 text-rose-600" />}
        <p className="text-sm font-medium text-slate-600">{isLoading ? 'Завантаження журналу оцінювання...' : loadError || 'Не вдалося завантажити базу даних'}</p>
        {!isLoading && <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Спробувати знову</button>}
      </div>
    );
  }

  if (route.name === 'feedback') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <StudentFeedbackPage
          lessonId={route.lessonId}
          db={db}
          onSubmitFeedback={handleSubmitFeedback}
        />
      </>
    );
  }

  if (route.name === 'student-portal') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <StudentPortalPage
          studentId={route.studentId}
          db={db}
          onBack={() => navigate(getScheduleHash())}
        />
      </>
    );
  }

  const currentClass = db.classes.find((c) => c.id === selectedClassId);

  const renderReportsOverview = () => currentClass && (
    <ReportsOverviewModal
      isOpen
      presentation="page"
      onClose={() => navigate('#/schedule')}
      currentClassId={selectedClassId}
      className={currentClass.name}
      db={db}
      initialFilterMode={route.name === 'reports' ? route.classOrParallelId : undefined}
      onSelectStudentForReport={setReportStudent}
      onOpenAnalytics={setAnalyticsStudent}
      onEditStudent={setEditingStudent}
      onOpenBatchReport={(students, groupName) => setBatchReportData({ students, groupName })}
      onDeleteStudent={handleDeleteStudent}
      onToggleReportSent={handleToggleReportSent}
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-800">
      <Toaster position="top-right" richColors />

      {pendingDb && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-950">
          <span>Є правки, не підтверджені сервером. {getLastSaveError() || 'Перед оновленням сторінки збережіть їх копію.'}</span>
          <button type="button" onClick={handleRetryPending} disabled={saveStatus === 'saving'} className="rounded-lg border border-amber-700 bg-white px-2 py-1 font-semibold hover:bg-amber-50 disabled:opacity-50">Повторити запис</button>
          <button type="button" onClick={handleInspectServer} disabled={inspectingServer || saveStatus === 'saving'} className="rounded-lg border border-amber-700 bg-white px-2 py-1 font-semibold hover:bg-amber-50 disabled:opacity-50">{inspectingServer ? 'Завантаження…' : 'Порівняти з сервером'}</button>
          <button type="button" onClick={() => exportDatabaseToFile(pendingDb, 'parents_feedback_unsynced')} className="rounded-lg border border-amber-700 px-2 py-1 font-semibold hover:bg-amber-200">Експортувати JSON</button>
        </div>
      )}

      {/* Головна верхня панель навігації */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Бренд & Назва */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Журнал уроків та зворотний зв'язок
              </h1>
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="hidden sm:inline">Локальний файл: <code className="text-slate-600 font-mono">data/database.json</code></span>
                <span className="hidden sm:inline">•</span>
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Loader2 className="w-3 h-3 animate-spin" /> Збереження...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Збережено на сервері
                  </span>
                )}
                {saveStatus === 'offline' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300" title="Зміни збережено в локальному сховищі браузера">
                    <CloudOff className="w-3.5 h-3.5 text-amber-600" /> Автономний режим
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Помилка сервера
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Cloud className="w-3 h-3 text-slate-400" /> Синхронізовано
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Навігація між основними розділами: Розклад / Журнал / Дашборд */}
          <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 whitespace-nowrap [&>button]:shrink-0 lg:order-none lg:w-auto">
            <button type="button" onClick={() => navigate('#/today')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${route.name === 'today' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Сьогодні</button>
            <button type="button" onClick={() => navigate('#/reports')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${route.name === 'reports' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}><Sparkles className="h-3.5 w-3.5" />Повідомлення</button>
            <button
              type="button"
              onClick={() => navigate('#/schedule')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                route.name === 'schedule'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Розклад</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('#/journal')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                route.name === 'journal'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Журнал класів</span>
              <span className="sm:hidden">Журнал</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('#/kp')}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${route.name === 'kp' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Mountain className="w-3.5 h-3.5 shrink-0" />
              <span>Бонуси KP</span>
            </button>
          </div>

          {/* Панель інструментів */}
          <details ref={managementMenuRef} className="relative ml-auto">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><Settings2 className="h-4 w-4" />Керування</summary>
            <div onClickCapture={() => { if (managementMenuRef.current) managementMenuRef.current.open = false; }} className="absolute right-0 top-full z-50 mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <button type="button" aria-label="Дашборд школи" onClick={() => navigate('#/dashboard')} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><BarChart2 className="h-4 w-4 text-indigo-600" />Дашборд школи</button>
            <button
              aria-label="Критерії оцінювання"
              onClick={() => setIsCriteriaOpen(true)}
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Критерії (0-12)</span>
            </button>

            {/* Кнопка Нотифікацій */}
            <button
              aria-label="Завдання та контроль уваги"
              onClick={() => setIsAttentionTasksOpen(true)}
              className="relative flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Завдання та контроль уваги"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              Завдання
              {(db.attentionTasks || []).filter((t) => !t.isCompleted).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 animate-pulse">
                  {(db.attentionTasks || []).filter((t) => !t.isCompleted).length}
                </span>
              )}
            </button>

            <button
              aria-label="PIN-коди учнів"
              onClick={() => setIsPinsModalOpen(true)}
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Переглянути та роздати PIN-коди учнів для фідбеку"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>PIN-коди учнів</span>
            </button>

            <button
              aria-label="Експорт JSON"
              onClick={handleExportJson}
              title="Експортувати базу даних у файл .json"
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Експорт JSON</span>
            </button>

            <button
              type="button"
              aria-label="Імпорт JSON"
              onClick={() => fileInputRef.current?.click()}
              title="Імпортувати дані з файлу .json"
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Імпорт JSON</span>
            </button>
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleImportJson} className="hidden" />

            <div className="my-1 h-px bg-slate-200" />

            <button
              aria-label="Вийти із системи"
              onClick={() => logout()}
              title="Вийти з системи"
              className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Вийти</span>
            </button>
            </div>
          </details>
        </div>

        {/* Вкладки класів (відображаються у режимі журналу) */}
        {route.name === 'journal' && (
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
              {db.classes.map((c) => {
                const isActive = c.id === selectedClassId;
                const count = db.students.filter((s) => s.classId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClassId(c.id);
                      navigate(getClassHash(c.id));
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsClassesModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 rounded-lg hover:bg-slate-200/50 transition-colors ml-1 shrink-0"
                title="Додати або налаштувати класи"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Керування класами
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Основна робоча зона залежно від активного роуту */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 space-y-4">
        {db.classes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto mt-10 space-y-3">
            <FolderOpen className="w-10 h-10 text-indigo-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Створіть свій перший клас</h2>
            <p className="text-xs text-slate-500">
              Додайте класи (наприклад, 6-А, 6-Б), щоб почати роботу з журналом уроків.
            </p>
            <button
              onClick={() => setIsClassesModalOpen(true)}
              className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              Створити клас
            </button>
          </div>
        ) : route.name === 'student' ? (
          <StudentPage
            studentId={route.studentId}
            db={db}
            onBackToJournal={() => navigate('#/schedule')}
            onEditStudent={(student) => setEditingStudent(student)}
            onDeleteStudent={handleDeleteStudent}
          />
        ) : route.name === 'kp' ? (
          <KpPage db={db} onAwardKp={handleAwardKp} onRevokeKp={handleRevokeWeeklyKp} />
        ) : route.name === 'today' ? (
          <TodayPage db={db} onSchedule={() => navigate('#/schedule')} onJournal={(classId) => { setSelectedClassId(classId); navigate(getClassHash(classId)); }} onReports={() => navigate('#/reports')} onKp={() => navigate('#/kp')} onTasks={() => setIsAttentionTasksOpen(true)} />
        ) : route.name === 'reports' ? (
          renderReportsOverview()
        ) : route.name === 'dashboard' ? (
          <GlobalDashboard
            db={db}
            onSelectClass={(classId) => {
              setSelectedClassId(classId);
              navigate(getClassHash(classId));
            }}
            onOpenReportsForGroup={(filterId) => {
              navigate(getReportsHash(filterId));
            }}
          />
        ) : route.name === 'journal' ? (
          <JournalTable
            currentClassId={selectedClassId}
            db={db}
            onUpdateScore={handleUpdateScore}
            onToggleAbsent={handleToggleAbsent}
            onUpdateLessonNotes={handleUpdateLessonNotes}
            onUpdateStudentNotes={handleUpdateStudentNotes}
            onDeleteLesson={handleDeleteLesson}
            onUpdateLesson={handleUpdateLesson}
            onBulkFillLessonScore={handleBulkFillLessonScore}
            onMarkAllPresent={handleMarkAllPresent}
            onOpenAddLesson={() => setIsAddLessonOpen(true)}
            onOpenBulkAddLesson={() => setIsBulkAddLessonOpen(true)}
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
            onOpenStudentReport={(student) => setReportStudent(student)}
            onOpenAddCriterion={() => setIsCriteriaOpen(true)}
            onDeleteCriterion={handleDeleteCriterion}
            onCopyLessonResults={handleCopyLessonResults}
          />
        ) : (
          <TeacherSchedulePage
            db={db}
            onUpdateScore={handleUpdateScore}
            onToggleAbsent={handleToggleAbsent}
            onUpdateLessonNotes={handleUpdateLessonNotes}
            onUpdateStudentNotes={handleUpdateStudentNotes}
            onDeleteLesson={handleDeleteLesson}
            onUpdateLesson={handleUpdateLesson}
            onBulkFillLessonScore={handleBulkFillLessonScore}
            onMarkAllPresent={handleMarkAllPresent}
            onOpenStudentReport={(student) => setReportStudent(student)}
            onOpenAddCriterion={() => setIsCriteriaOpen(true)}
            onDeleteCriterion={handleDeleteCriterion}
            onOpenAddLesson={() => setIsAddLessonOpen(true)}
            onOpenBulkAddLesson={() => setIsBulkAddLessonOpen(true)}
            onCreateNextWeek={handleBulkAddLessons}
            onCopyLessonResults={handleCopyLessonResults}
            onNavigateToClassJournal={(classId) => {
              setSelectedClassId(classId);
              navigate(getClassHash(classId));
            }}
          />
        )}
      </main>

      {/* Модальні вікна */}
      <ManageClassesModal
        isOpen={isClassesModalOpen}
        onClose={() => setIsClassesModalOpen(false)}
        classes={db.classes}
        onAddClass={handleAddClass}
        onDeleteClass={handleDeleteClass}
      />

      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        classes={db.classes}
        defaultClassId={selectedClassId}
        onAddStudent={handleAddStudent}
      />

      <AddLessonModal
        isOpen={isAddLessonOpen}
        onClose={() => setIsAddLessonOpen(false)}
        classes={db.classes}
        defaultClassId={selectedClassId}
        onAddLesson={handleAddLesson}
      />

      <BulkAddLessonsModal
        isOpen={isBulkAddLessonOpen}
        onClose={() => setIsBulkAddLessonOpen(false)}
        classes={db.classes}
        defaultClassId={selectedClassId}
        existingLessons={db.lessons}
        onBulkAddLessons={handleBulkAddLessons}
      />

      <ManageCriteriaModal
        isOpen={isCriteriaOpen}
        onClose={() => setIsCriteriaOpen(false)}
        criteria={db.criteria}
        onAddCriterion={handleAddCriterion}
        onDeleteCriterion={handleDeleteCriterion}
      />


      {reportStudent && (
        <StudentReportModal
          isOpen={!!reportStudent}
          onClose={() => setReportStudent(null)}
          student={reportStudent}
          className={
            db.classes.find((c) => c.id === reportStudent.classId)?.name ||
            currentClass?.name ||
            'Клас'
          }
          db={db}
          onToggleReportSent={handleToggleReportSent}
          onSaveSingleReport={handleSaveSingleReport}
          onSaveSingleReportContent={handleSaveSingleReportContent}
        />
      )}

      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        classes={db.classes}
        onSaveStudent={handleSaveStudent}
      />

      <StudentAnalyticsModal
        isOpen={!!analyticsStudent}
        onClose={() => setAnalyticsStudent(null)}
        student={analyticsStudent}
        db={db}
        onOpenReport={(student) => {
          setAnalyticsStudent(null);
          setReportStudent(student);
        }}
        onEditStudent={(student) => {
          setAnalyticsStudent(null);
          setEditingStudent(student);
        }}
      />

      {batchReportData && (
        <BatchReportModal
          isOpen={!!batchReportData}
          onClose={() => setBatchReportData(null)}
          students={batchReportData.students}
          groupName={batchReportData.groupName}
          db={db}
          onToggleReportSent={handleToggleReportSent}
          onSaveBatchReports={handleSaveBatchReports}
        />
      )}

      <StudentPinsModal
        isOpen={isPinsModalOpen}
        onClose={() => setIsPinsModalOpen(false)}
        db={db}
        currentClassId={selectedClassId}
        onUpdateStudentPin={handleUpdateStudentPin}
      />

      <AttentionTasksModal
        isOpen={isAttentionTasksOpen}
        onClose={() => setIsAttentionTasksOpen(false)}
        db={db}
        onAddTask={handleAddAttentionTask}
        onCompleteTask={handleCompleteAttentionTask}
      />

      {importCandidate && <ImportBackupModal
        current={db}
        incoming={importCandidate.data}
        fileName={importCandidate.fileName}
        onClose={() => setImportCandidate(null)}
        onExportCurrent={() => exportDatabaseToFile(db)}
        onImport={async (data) => {
          const status = await updateDbAndSave(() => data);
          if (status === 'saved' && data.classes.length > 0) setSelectedClassId(data.classes[0].id);
          return status;
        }}
      />}

      {serverSnapshot && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="server-compare-title" className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="server-compare-title" className="text-lg font-bold text-slate-900">Порівняння з сервером</h2>
          <p className="text-sm text-slate-600">На сервері є інша версія даних. Перевірте обсяг змін перед поверненням до неї.</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {[['Класи', pendingDb?.classes.length ?? db.classes.length, serverSnapshot.data.classes.length], ['Учні', pendingDb?.students.length ?? db.students.length, serverSnapshot.data.students.length], ['Уроки', pendingDb?.lessons.length ?? db.lessons.length, serverSnapshot.data.lessons.length]].map(([label, local, remote]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold">{label}</p><p className="mt-1 text-xs">Браузер: {local}</p><p className="text-xs">Сервер: {remote}</p></div>)}
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">Оцінки й відвідуваність: {JSON.stringify(pendingDb?.records ?? db.records) === JSON.stringify(serverSnapshot.data.records) ? 'однакові' : 'є відмінності'} · Коментарі: {JSON.stringify(pendingDb?.savedReports ?? db.savedReports) === JSON.stringify(serverSnapshot.data.savedReports) ? 'однакові' : 'є відмінності'} · Бонуси: {JSON.stringify(pendingDb?.kpTransactions ?? db.kpTransactions) === JSON.stringify(serverSnapshot.data.kpTransactions) ? 'однакові' : 'є відмінності'}</div>
          <p className="text-xs text-amber-800">Після вибору серверної версії локальні правки автоматично завантажаться окремим JSON-файлом. Їх можна буде переглянути або імпортувати пізніше.</p>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setServerSnapshot(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Залишити локальні правки</button><button type="button" onClick={handleAcceptServer} disabled={saveStatus === 'saving'} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Завантажити серверну версію</button></div>
        </div>
      </div>}

    </div>
  );
};
export default App;
