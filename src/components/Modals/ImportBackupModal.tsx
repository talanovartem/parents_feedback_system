import React, { useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseSchema } from '../../types/feedback';
import { SaveStatus } from '../../services/storage';
import { backupSummary } from '../../utils/backupValidation';

interface Props {
  current: DatabaseSchema;
  incoming: DatabaseSchema;
  fileName: string;
  onClose: () => void;
  onExportCurrent: () => void;
  onImport: (data: DatabaseSchema) => Promise<SaveStatus>;
}

export const ImportBackupModal: React.FC<Props> = ({ current, incoming, fileName, onClose, onExportCurrent, onImport }) => {
  const [busy, setBusy] = useState(false);
  const currentCounts = backupSummary(current);
  const incomingCounts = backupSummary(incoming);
  const rows: { key: keyof typeof currentCounts; title: string }[] = [
    { key: 'classes', title: 'Класи' }, { key: 'students', title: 'Учні' }, { key: 'lessons', title: 'Уроки' },
    { key: 'reports', title: 'Коментарі' }, { key: 'kp', title: 'Операції KP' },
  ];
  const fewer = rows.some(({ key }) => incomingCounts[key] < currentCounts[key]);

  const confirm = async () => {
    setBusy(true);
    try {
      const status = await onImport(incoming);
      if (status === 'saved') {
        toast.success('Резервну копію імпортовано й збережено на сервері');
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="backup-title" className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5"><div><h2 id="backup-title" className="text-lg font-bold text-slate-900">Перевірка резервної копії</h2><p className="mt-1 break-all text-xs text-slate-500">{fileName}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Закрити перегляд імпорту" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-700">Імпорт повністю замінить поточну базу. Порівняйте вміст перед продовженням.</p>
        <div className="overflow-hidden rounded-xl border border-slate-200 text-sm"><div className="grid grid-cols-3 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"><span>Дані</span><span className="text-right">Зараз</span><span className="text-right">У файлі</span></div>{rows.map(({ key, title }) => <div key={key} className="grid grid-cols-3 border-t border-slate-100 px-3 py-2"><span>{title}</span><span className="text-right">{currentCounts[key]}</span><span className={`text-right font-semibold ${incomingCounts[key] < currentCounts[key] ? 'text-rose-700' : 'text-slate-800'}`}>{incomingCounts[key]}</span></div>)}</div>
        {fewer && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">У файлі менше даних у деяких розділах. Перед заміною збережіть поточну базу.</p>}
        <button type="button" onClick={onExportCurrent} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Завантажити поточну базу</button>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-5"><button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">Скасувати</button><button type="button" onClick={confirm} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50"><Upload className="h-4 w-4" />{busy ? 'Збереження…' : 'Замінити базу даних'}</button></div>
    </div>
  </div>;
};
