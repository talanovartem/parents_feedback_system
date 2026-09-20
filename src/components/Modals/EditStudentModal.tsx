import React, { useState, useEffect } from 'react';
import { ClassItem, Student } from '../../types/feedback';
import { X, UserCheck } from 'lucide-react';
import { VoiceInputButton } from '../Common/VoiceInputButton';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassItem[];
  onSaveStudent: (updatedStudent: Student) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  onSaveStudent,
}) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setClassId(student.classId);
      setNotes(student.notes || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !classId) return;

    onSaveStudent({
      ...student,
      name: name.trim(),
      classId,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200 border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Редагувати профіль учня</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Прізвище та ім'я учня *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Олена Сидоренко"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Клас *
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Особливості сприйняття / Контекст для ШІ
              </label>
              <div className="flex items-center gap-2">
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                />
                <span className="text-[11px] text-slate-400">Конфіденційно</span>
              </div>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Індивідуальний темп роботи, підвищена чутливість, зорове сприйняття, похвала за зусилля, сильні сторони..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Ці нотатки будуть автоматично передаватись у промпт ШІ, щоб звіт для батьків враховував індивідуальність дитини.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              Зберегти зміни
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
