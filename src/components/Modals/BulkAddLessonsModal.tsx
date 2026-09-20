import React, { useState, useId, useRef } from 'react';
import { ClassItem, Lesson } from '../../types/feedback';
import { parseLessonsInput, ParsedLessonItem, getSchoolTodayUrl } from '../../utils/lessonParser';
import {
  X,
  Layers,
  FileText,
  Upload,
  Sparkles,
  AlertTriangle,
  Trash2,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkAddLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  defaultClassId: string;
  existingLessons: Lesson[];
  onBulkAddLessons: (lessons: Omit<Lesson, 'id'>[]) => void;
}

const SAMPLE_SCHOOL_TODAY = `Дата\tЧас\tПредмет\tКлас\tТема\tНотатки\tВідвідування\tФайли\tДомашнє завдання\t
21.09.2026\t14:20 - 14:55\tУкраїнська мова\t8A\tЧастини мови. Службові частини мови. Вигук\t\tНі\t\tТак\t
21.09.2026\t14:20 - 14:55\tУкраїнська мова\t8B\tЧастини мови. Службові частини мови. Вигук\t\tНі\t\tТак\t
21.09.2026\t15:00 - 15:35\tУкраїнська мова\t8A\tСтилі і типи мовлення.  Текст. Граматичні та лексичні помилки\t\tНі\t\tНі\t
21.09.2026\t15:00 - 15:35\tУкраїнська мова\t8B\tСтилі і типи мовлення.  Текст. Граматичні та лексичні помилки\t\tНі\t\tНі\t
23.09.2026\t09:00 - 09:40\tУкраїнська мова\t7A\t\t\tНі\t\tНі\t
23.09.2026\t09:00 - 09:40\tУкраїнська мова\t7B\t\t\tНі\t\tНі\t
24.09.2026\t13:40 - 14:15\tУкраїнська мова\t10A\tБезполучникове складне речення.\t\tНі\t\tНі\t
24.09.2026\t13:40 - 14:15\tУкраїнська мова\t10B\tБезполучникове складне речення.\t\tНі\t\tНі\t`;

const SAMPLE_TEXT_TABLE = `01.09.2026 | 6-А | 1 | Знайомство з курсом. Вступне тестування
01.09.2026 | 6-В | 1 | Вступний урок. Правила безпеки
02.09.2026 | 7-А | 1 | Unit 1: Present Simple vs Continuous
03.09.2026 | 8-А | 1 | Passive Voice: Basics
04.09.2026 | 9-В | 1 | First Conditional & Vocabulary
05.09.2026 | 10-В | 1 | Advanced Essay Structure`;

const SAMPLE_TEXT_LIST = `08.09.2026 6-А Урок 1: Лексика до теми "Школа"
09.09.2026 6-А Урок 2: Діалоги та аудіювання
10.09.2026 7-В Урок 1: Граматичний практикум
11.09.2026 10-А Урок 1: Підготовка до міжнародного іспиту`;

export const BulkAddLessonsModal: React.FC<BulkAddLessonsModalProps> = ({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  existingLessons,
  onBulkAddLessons,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedDefaultClass, setSelectedDefaultClass] = useState(defaultClassId);
  const [parsedRows, setParsedRows] = useState<ParsedLessonItem[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [weekOffset, setWeekOffset] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadId = useId();

  if (!isOpen) return null;

  const schoolToday = getSchoolTodayUrl(weekOffset);

  const handleParse = (textToParse: string, classId: string) => {
    const results = parseLessonsInput(textToParse, classes, classId, existingLessons);
    setParsedRows(results);
    if (results.length > 0) {
      toast.success(`Розпізнано уроків: ${results.length}`);
    } else if (textToParse.trim()) {
      toast.warning('Не вдалося знайти уроки в наданому тексті');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    handleParse(val, selectedDefaultClass);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        setActiveTab('text');
        handleParse(content, selectedDefaultClass);
        toast.info(`Файл "${file.name}" прочитано`);
      }
    };
    reader.onerror = () => {
      toast.error('Не вдалося прочитати файл');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const handleToggleRow = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleUpdateRow = (id: string, updates: Partial<ParsedLessonItem>) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleDeleteRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleApplySample = (sample: string) => {
    setInputText(sample);
    handleParse(sample, selectedDefaultClass);
  };

  const handleSave = () => {
    const toCreate = parsedRows
      .filter((r) => r.selected)
      .map((r) => ({
        classId: r.classId,
        date: r.date,
        lessonNumber: r.lessonNumber,
        time: r.time,
        topic: r.topic.trim() || undefined,
      }));

    if (toCreate.length === 0) {
      toast.warning('Виберіть хоча б один урок для збереження');
      return;
    }

    onBulkAddLessons(toCreate);
    onClose();
  };

  const selectedCount = parsedRows.filter((r) => r.selected).length;

  // Підрахунок за класами
  const countsByClass: Record<string, number> = {};
  for (const r of parsedRows) {
    if (r.selected) {
      countsByClass[r.classId] = (countsByClass[r.classId] || 0) + 1;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Шапка модального вікна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Масове додавання уроків
              </h2>
              <p className="text-xs text-slate-500">
                Підтримка вставки з School Today, розкладу занять або файлів
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Основна частина */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700">
          {/* Панель швидкого переходу до School Today */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Розклад у School Today</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    ({schoolToday.startDateStr} – {schoolToday.endDateStr})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Відкрийте розклад, виділіть таблицю (Ctrl+A / мишею), скопіюйте (Ctrl+C) та вставте нижче
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Попередній тиждень"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                    weekOffset === 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Поточний тиждень"
                >
                  Цей тиждень
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Наступний тиждень"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <a
                href={schoolToday.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span>Відкрити School Today</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Панель опцій та вибору джерела */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            {/* Перемикач режиму введення */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Вставити текст
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('file');
                  fileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'file'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Завантажити файл (.txt / .csv)
              </button>
            </div>

            {/* Клас за замовчуванням (якщо в рядку клас не вказано) */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Клас за замовчуванням:</span>
              <select
                value={selectedDefaultClass}
                onChange={(e) => {
                  const newCls = e.target.value;
                  setSelectedDefaultClass(newCls);
                  if (inputText) handleParse(inputText, newCls);
                }}
                className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Вкладка: Текстове поле */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="font-semibold text-slate-700 uppercase tracking-wider">
                Вставте скопійовану таблицю або текст:
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Приклади:</span>
                <button
                  type="button"
                  onClick={() => handleApplySample(SAMPLE_SCHOOL_TODAY)}
                  className="px-2 py-0.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded text-[11px] font-semibold transition-colors border border-blue-200"
                >
                  School Today
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySample(SAMPLE_TEXT_TABLE)}
                  className="px-2 py-0.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-medium transition-colors"
                >
                  Таблиця |
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySample(SAMPLE_TEXT_LIST)}
                  className="px-2 py-0.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-medium transition-colors"
                >
                  Список
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={handleTextChange}
              placeholder="Вставте рядки з School Today або довільного формату. Наприклад:&#10;21.09.2026	14:20 - 14:55	Українська мова	8A	Частини мови...&#10;21.09.2026	15:00 - 15:35	Українська мова	8A	Стилі і типи мовлення..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            />
          </div>

          <input
            id={fileUploadId}
            type="file"
            ref={fileInputRef}
            accept=".txt,.csv,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Таблиця передперегляду розпізнаних уроків */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Розпізнано: <strong className="text-indigo-600 font-bold">{parsedRows.length}</strong> уроків</span>
                  <span>(обрано до створення: <strong className="text-emerald-600 font-bold">{selectedCount}</strong>)</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Виділити всі
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium"
                  >
                    <Square className="w-3.5 h-3.5" /> Зняти виділення
                  </button>
                </div>
              </div>

              {/* Розподіл по класах */}
              <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-slate-600">
                <span className="text-slate-400">Розподіл за класами:</span>
                {Object.entries(countsByClass).map(([clsId, count]) => {
                  const cls = classes.find((c) => c.id === clsId);
                  return (
                    <span
                      key={clsId}
                      className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium border border-indigo-100"
                    >
                      {cls?.name || clsId}: {count}
                    </span>
                  );
                })}
              </div>

              {/* Власне таблиця */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Вибір</th>
                      <th className="py-2.5 px-3 w-32">Дата</th>
                      <th className="py-2.5 px-3 w-28">Час</th>
                      <th className="py-2.5 px-3 w-28">Клас</th>
                      <th className="py-2.5 px-3 w-16 text-center">№</th>
                      <th className="py-2.5 px-3">Тема уроку</th>
                      <th className="py-2.5 px-3 w-24 text-center">Статус</th>
                      <th className="py-2.5 px-2 w-10 text-center">Дія</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !row.selected ? 'opacity-50 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleToggleRow(row.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateRow(row.id, { date: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-full focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="14:20 - 14:55"
                            value={row.time || ''}
                            onChange={(e) => handleUpdateRow(row.id, { time: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-full text-center focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.classId}
                            onChange={(e) => handleUpdateRow(row.id, { classId: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-full font-semibold text-slate-700 bg-white focus:ring-1 focus:ring-indigo-500"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={row.lessonNumber}
                            onChange={(e) =>
                              handleUpdateRow(row.id, { lessonNumber: Number(e.target.value) || 1 })
                            }
                            className="px-1 py-1 border border-slate-200 rounded-lg text-xs w-12 text-center focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.topic}
                            onChange={(e) => handleUpdateRow(row.id, { topic: e.target.value })}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-full focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Дублікат
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Новий
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            title="Видалити рядок"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Футер із діями */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Скасувати
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={selectedCount === 0}
            className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all ${
              selectedCount > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Layers className="w-4 h-4" />
            Створити розпізнані уроки ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
};
