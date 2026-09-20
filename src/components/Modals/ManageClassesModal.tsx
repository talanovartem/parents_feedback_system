import React, { useState } from 'react';
import { ClassItem } from '../../types/feedback';
import { X, Plus, Trash2, School } from 'lucide-react';

interface ManageClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  onAddClass: (name: string) => void;
  onDeleteClass: (id: string) => void;
}

export const ManageClassesModal: React.FC<ManageClassesModalProps> = ({
  isOpen,
  onClose,
  classes,
  onAddClass,
  onDeleteClass,
}) => {
  const [newClassName, setNewClassName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onAddClass(newClassName.trim());
    setNewClassName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <School className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Керування класами</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Наприклад: 7-А, 6-Б"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newClassName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Додати
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Існуючі класи ({classes.length})
            </p>
            {classes.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-2">Немає доданих класів</p>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/60"
                >
                  <span className="text-sm font-medium text-slate-700">{cls.name}</span>
                  <button
                    onClick={() => onDeleteClass(cls.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-white transition-colors"
                    title="Видалити клас"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
