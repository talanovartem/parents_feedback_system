import React, { useState, useEffect, useRef } from 'react';
import { DatabaseSchema, Lesson, Student } from './types/feedback';
import { fetchDatabase, saveDatabase, exportDatabaseToFile, logout } from './services/storage';
import { migrateDatabase } from './services/migration';
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
import { TeacherSchedulePage } from './components/Schedule/TeacherSchedulePage';
import { useRouter, getClassHash } from './router/useRouter';
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
} from 'lucide-react';

export const App: React.FC = () => {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'error'>('idle');

  // Модальні вікна
  const [isClassesModalOpen, setIsClassesModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isBulkAddLessonOpen, setIsBulkAddLessonOpen] = useState(false);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const [isReportsOverviewOpen, setIsReportsOverviewOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [analyticsStudent, setAnalyticsStudent] = useState<Student | null>(null);
  const [batchReportData, setBatchReportData] = useState<{ students: Student[]; groupName: string } | null>(null);
  const [reportsInitialFilter, setReportsInitialFilter] = useState<string | undefined>(undefined);

  const { route, navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Завантаження при старті
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const data = await fetchDatabase();
      setDb(data);
      if (data.classes.length > 0) {
        if (route.name === 'journal' && route.classId) {
          setSelectedClassId(route.classId);
        } else {
          setSelectedClassId(data.classes[0].id);
        }
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
    if (route.name === 'reports') {
      setReportsInitialFilter(route.classOrParallelId);
      setIsReportsOverviewOpen(true);
    }
  }, [route]);

  // Оновлення БД зі збереженням
  const updateDbAndSave = async (updater: (prev: DatabaseSchema) => DatabaseSchema, successToast?: string) => {
    if (!db) return;
    const updated = updater(db);
    setDb(updated);
    setSaveStatus('saving');

    const ok = await saveDatabase(updated);
    if (ok) {
      setSaveStatus('saved');
      if (successToast) {
        toast.success(successToast);
      }
      setTimeout(() => setSaveStatus('idle'), 2500);
    } else {
      setSaveStatus('offline');
      toast.error('Автономний режим: збережено локально, сервер недоступний.');
    }
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
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
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

  // Видалення учня
  const handleDeleteStudent = (studentId: string) => {
    const s = db?.students.find((std) => std.id === studentId);
    if (!s) return;
    if (!window.confirm(`Видалити учня "${s.name}"?`)) return;

    updateDbAndSave((prev) => {
      const students = prev.students.filter((std) => std.id !== studentId);
      const records = { ...prev.records };
      delete records[studentId];
      return { ...prev, students, records };
    }, `Учня "${s.name}" видалено`);
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

    updateDbAndSave((prev) => {
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
  const handleBulkFillLessonScore = (lessonId: string, criterionId: string, score: number | null) => {
    updateDbAndSave((prev) => {
      const records = { ...prev.records };
      const lesson = prev.lessons.find((l) => l.id === lessonId);
      if (!lesson) return prev;
      const classStudents = prev.students.filter((s) => s.classId === lesson.classId);
      for (const student of classStudents) {
        const studentRec = { ...(records[student.id] || {}) };
        const entry = { ...(studentRec[lessonId] || { scores: {} }) };
        if (!entry.absent) {
          const newScores = { ...(entry.scores || {}) };
          if (score === null) {
            delete newScores[criterionId];
          } else {
            newScores[criterionId] = score;
          }
          entry.scores = newScores;
          studentRec[lessonId] = entry;
          records[student.id] = studentRec;
        }
      }
      return { ...prev, records };
    }, score !== null ? `Виставлено бал ${score} усім присутнім` : 'Колонку очищено');
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

  // Позначення або зняття мітки надісланого звіту за період
  const handleToggleReportSent = (studentId: string, periodString: string) => {
    updateDbAndSave((prev) => {
      const sentReports = { ...(prev.sentReports || {}) };
      const key = `${studentId}:${periodString}`;
      if (sentReports[key]) {
        delete sentReports[key];
      } else {
        sentReports[key] = new Date().toISOString();
      }
      return { ...prev, sentReports };
    });
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

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const migrated = migrateDatabase(parsed);
          updateDbAndSave(() => migrated, 'Дані з JSON успішно імпортовано та оновлено');
          if (migrated.classes.length > 0) {
            setSelectedClassId(migrated.classes[0].id);
          }
        } else {
          toast.error('Некоректний формат файлу бази даних');
        }
      } catch {
        toast.error('Помилка зчитування JSON-файлу');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (isLoading || !db) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Завантаження журналу оцінювання...</p>
      </div>
    );
  }

  const currentClass = db.classes.find((c) => c.id === selectedClassId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-800">
      <Toaster position="top-right" richColors />

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
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => navigate('#/schedule')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                route.name === 'schedule'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Розклад</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('#/journal')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                route.name === 'journal'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Журнал класів</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('#/dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                route.name === 'dashboard'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Дашборд школи</span>
            </button>
          </div>

          {/* Панель інструментів */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setReportsInitialFilter(undefined);
                setIsReportsOverviewOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Звіти для батьків
            </button>

            <button
              onClick={() => setIsCriteriaOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Критерії (0-12)
            </button>

            <button
              onClick={handleExportJson}
              title="Експортувати базу даних у файл .json"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Експорт
            </button>

            <label
              title="Імпортувати дані з файлу .json"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Імпорт
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <div className="h-4 w-px bg-slate-200 my-auto mx-1" />

            <button
              onClick={() => logout()}
              title="Вийти з системи"
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              Вийти
            </button>
          </div>
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
          />
        ) : route.name === 'dashboard' ? (
          <GlobalDashboard
            db={db}
            onSelectClass={(classId) => {
              setSelectedClassId(classId);
              navigate(getClassHash(classId));
            }}
            onOpenReportsForGroup={(filterId) => {
              setReportsInitialFilter(filterId);
              setIsReportsOverviewOpen(true);
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

      {currentClass && (
        <ReportsOverviewModal
          isOpen={isReportsOverviewOpen}
          onClose={() => {
            setIsReportsOverviewOpen(false);
            setReportsInitialFilter(undefined);
          }}
          currentClassId={selectedClassId}
          className={currentClass.name}
          db={db}
          initialFilterMode={reportsInitialFilter}
          onSelectStudentForReport={(student) => {
            setReportStudent(student);
          }}
          onOpenAnalytics={(student) => {
            setAnalyticsStudent(student);
          }}
          onEditStudent={(student) => {
            setEditingStudent(student);
          }}
          onOpenBatchReport={(students, groupName) => {
            setBatchReportData({ students, groupName });
          }}
          onDeleteStudent={handleDeleteStudent}
          onToggleReportSent={handleToggleReportSent}
        />
      )}

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
        />
      )}
    </div>
  );
};
export default App;
