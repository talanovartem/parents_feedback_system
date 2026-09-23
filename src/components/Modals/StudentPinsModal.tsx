import React, { useState } from 'react';
import { DatabaseSchema, Student } from '../../types/feedback';
import { KeyRound, X, Copy, RefreshCw, Eye, EyeOff, Search, QrCode, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getStudentPortalHash } from '../../router/useRouter';

interface StudentPinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseSchema;
  currentClassId: string;
  onUpdateStudentPin: (studentId: string, newPin: string) => void;
}

export const StudentPinsModal: React.FC<StudentPinsModalProps> = ({
  isOpen,
  onClose,
  db,
  currentClassId,
  onUpdateStudentPin,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPins, setShowPins] = useState<boolean>(true);

  if (!isOpen) return null;

  const activeClass = db.classes.find((c) => c.id === selectedClassId) || db.classes[0];
  const classStudents = db.students.filter((s) => s.classId === activeClass?.id);

  const filteredStudents = classStudents.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleCopySinglePin = (student: Student) => {
    if (!student.pinCode) return;
    navigator.clipboard.writeText(student.pinCode);
    toast.success(`PIN-код для ${student.name} скопійовано: ${student.pinCode} 📋`);
  };

  const handleRegeneratePin = (student: Student) => {
    // Генерація випадкового 4-значного PIN-коду
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    onUpdateStudentPin(student.id, newPin);
    toast.success(`Новий PIN для ${student.name}: ${newPin} 🔑`);
  };

  const handleCopyAllPins = () => {
    if (classStudents.length === 0) return;
    const lines = [
      `🔑 Список PIN-кодів для форми зворотного зв'язку (${activeClass?.name || 'Клас'}):`,
      ...classStudents.map((s) => `• ${s.name} — PIN: ${s.pinCode || '—'} (баланс: ${s.karpatyPoints || 0} 🏔️)`),
      '',
      `💡 Посилання на форми уроків надає вчитель наприкінці кожного уроку.`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success(`Список PIN-кодів класу ${activeClass?.name} скопійовано в буфер! 📋`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">PIN-коди учнів для фідбеку</h2>
              <p className="text-xs text-slate-500">
                Персональні 4-значні коди для входу учнів в анкету уроку
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Панель вибору класу та пошуку */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Клас:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {db.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({db.students.filter((s) => s.classId === c.id).length} учн.)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPins ? 'Сховати' : 'Показати'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAllPins}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Скопіювати весь клас</span>
            </button>
          </div>
        </div>

        {/* Пошук учня */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук учня за ім'ям..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Таблиця списку PIN-кодів */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic text-xs">
              Учнів не знайдено
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {student.name}
                  </span>
                  {student.gender === 'female' ? (
                    <span className="text-xs" title="Дівчина">👧</span>
                  ) : (
                    <span className="text-xs" title="Хлопець">👦</span>
                  )}
                  {student.karpatyPoints !== undefined && student.karpatyPoints > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                      {student.karpatyPoints} 🏔️
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 min-w-[50px] text-center tracking-wider">
                    {showPins ? student.pinCode || '—' : '••••'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopySinglePin(student)}
                    title="Скопіювати PIN"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRegeneratePin(student)}
                    title="Згенерувати новий PIN (якщо учень забув)"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {student.accessCode && (
                    <>
                      <span
                        className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 tracking-widest cursor-help"
                        title={`Код для учнівського порталу: ${student.accessCode}`}
                      >
                        <QrCode className="w-3 h-3 inline mr-1 text-indigo-500" />
                        {showPins ? student.accessCode : '••••••'}
                      </span>
                      <a
                        href={getStudentPortalHash(student.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Відкрити учнівський портал"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        onClick={(e) => {
                          e.preventDefault();
                          const url = `${window.location.origin}${window.location.pathname}${getStudentPortalHash(student.id)}`;
                          navigator.clipboard.writeText(url);
                          toast.success(`Посилання для ${student.name} скопійовано 🔗`);
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Підвал */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Усього в класі: {classStudents.length} учнів</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
