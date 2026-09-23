import React, { useState } from 'react';
import { DatabaseSchema, AttentionTask, Student } from '../../types/feedback';
import { Bell, X, CheckCircle2, Plus, AlertCircle, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { todayLocalIso } from '../../utils/localDate';

interface AttentionTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DatabaseSchema;
  onAddTask: (task: Omit<AttentionTask, 'id' | 'createdAt'>) => void;
  onCompleteTask: (taskId: string) => void;
}

export const AttentionTasksModal: React.FC<AttentionTasksModalProps> = ({
  isOpen,
  onClose,
  db,
  onAddTask,
  onCompleteTask,
}) => {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskStudentId, setNewTaskStudentId] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(todayLocalIso());

  const tasks = db.attentionTasks || [];

  const studentMap: Record<string, Student> = {};
  db.students.forEach((s) => (studentMap[s.id] = s));

  if (!isOpen) return null;

  const activeCount = tasks.filter((t) => !t.isCompleted).length;

  const filteredTasks = (() => {
    let list = tasks;
    if (filter === 'active') list = list.filter((t) => !t.isCompleted);
    if (filterClassId) list = list.filter((t) => t.classId === filterClassId);
    return [...list].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  })();

  const handleAdd = () => {
    if (!newTaskText.trim() || !newTaskStudentId) {
      toast.error('Вкажіть учня та текст завдання');
      return;
    }
    const student = studentMap[newTaskStudentId];
    if (!student) return;
    onAddTask({
      studentId: newTaskStudentId,
      classId: student.classId,
      date: newTaskDate,
      text: newTaskText.trim(),
      isCompleted: false,
    });
    setNewTaskText('');
    setNewTaskStudentId('');
    setNewTaskDate(todayLocalIso());
    setIsAdding(false);
    toast.success('Завдання додано ⚠️');
  };

  const handleComplete = (taskId: string) => {
    onCompleteTask(taskId);
    toast.success('Завдання позначено виконаним ✅');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeCount > 9 ? '9+' : activeCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">Завдання та контроль уваги</h2>
              <p className="text-xs text-slate-500">
                {activeCount > 0 ? `${activeCount} активних завдань` : 'Усі завдання виконано'}
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

        {/* Фільтри */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Активні
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Усі
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="">Усі класи</option>
              {db.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="ml-auto px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Додати завдання
          </button>
        </div>

        {/* Форма додавання */}
        {isAdding && (
          <div className="px-4 py-3 border-b border-slate-100 bg-rose-50/30 space-y-2">
            <div className="flex gap-2">
              <select
                value={newTaskStudentId}
                onChange={(e) => setNewTaskStudentId(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="">— Обрати учня —</option>
                {db.students.map((s) => {
                  const cls = db.classes.find((c) => c.id === s.classId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({cls?.name || '—'})
                    </option>
                  );
                })}
              </select>
              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Наприклад: не здав контрольну роботу"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition"
              >
                Додати
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Список завдань */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              {filter === 'active' ? 'Немає активних завдань ✅' : 'Завдань не знайдено'}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const student = studentMap[task.studentId];
              const cls = db.classes.find((c) => c.id === task.classId);
              return (
                <div
                  key={task.id}
                  className={`px-4 py-3 flex items-start gap-3 ${task.isCompleted ? 'opacity-50' : 'hover:bg-rose-50/30'} transition`}
                >
                  <div className={`mt-0.5 shrink-0 ${task.isCompleted ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {task.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">{student?.name || '—'}</span>
                      {cls && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{cls.name}</span>}
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {task.date}
                      </span>
                    </div>
                  </div>
                  {!task.isCompleted && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="shrink-0 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                    >
                      ✓ Виконано
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Підвал */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Активних: <strong className="text-rose-600">{activeCount}</strong></span>
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
