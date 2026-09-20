import React, { useState } from 'react';
import { Criterion } from '../../types/feedback';
import { X, Plus, Trash2, Sliders } from 'lucide-react';

interface ManageCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: Criterion[];
  onAddCriterion: (name: string, description?: string) => void;
  onDeleteCriterion: (id: string) => void;
}

export const ManageCriteriaModal: React.FC<ManageCriteriaModalProps> = ({
  isOpen,
  onClose,
  criteria,
  onAddCriterion,
  onDeleteCriterion,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCriterion(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Види діяльності та критерії (0-12)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Усі критерії оцінюються за єдиною шкалою від 0 до 12 балів. Вони з'являються як підколонки у кожному уроці.
          </p>

          <form onSubmit={handleSubmit} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Назва виду діяльності (наприклад: Домашнє завдання)"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Додати
              </button>
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис критерію (необов'язково)"
              className="w-full px-3 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-600"
            />
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {criteria.map((crit) => (
              <div
                key={crit.id}
                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-xs"
              >
                <div>
                  <span className="text-sm font-medium text-slate-800">{crit.name}</span>
                  {crit.description && (
                    <p className="text-xs text-slate-400">{crit.description}</p>
                  )}
                </div>
                <button
                  onClick={() => onDeleteCriterion(crit.id)}
                  disabled={criteria.length <= 1}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors disabled:opacity-30"
                  title="Видалити критерій"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
