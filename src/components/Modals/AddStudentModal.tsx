import React, { useState, useEffect } from 'react';
import { ClassItem, Student } from '../../types/feedback';
import { X, UserPlus } from 'lucide-react';
import { VoiceInputButton } from '../Common/VoiceInputButton';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  defaultClassId: string;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  onAddStudent,
}) => {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(defaultClassId);
  const [notes, setNotes] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  useEffect(() => {
    setClassId(defaultClassId);
  }, [defaultClassId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !classId) return;

    onAddStudent({
      name: name.trim(),
      classId,
      notes: notes.trim() || undefined,
      gender,
    });

    setName('');
    setNotes('');
    setGender('male');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Додати учня</h2>
          </div>
          <button
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Стать
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
                  gender === 'male'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                }`}
              >
                👦 Хлопець
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${
                  gender === 'female'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                }`}
              >
                👧 Дівчина
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Загальні примітки / особливості
              </label>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }}
              />
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Індивідуальний темп роботи, захоплення, особливості сприйняття..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Додати учня
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
