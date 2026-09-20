import React, { useState, useEffect } from 'react';
import { SavedReport, Student } from '../../types/feedback';
import { X, FileText, Copy, CheckCircle2, Clock } from 'lucide-react';
import { VoiceInputButton } from '../Common/VoiceInputButton';
import { toast } from 'sonner';

interface EditSavedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  report: SavedReport;
  onSave: (content: string) => void;
  onToggleSent: () => void;
}

export const EditSavedReportModal: React.FC<EditSavedReportModalProps> = ({
  isOpen,
  onClose,
  student,
  report,
  onSave,
  onToggleSent,
}) => {
  const [content, setContent] = useState(report.content);

  useEffect(() => {
    setContent(report.content);
  }, [report]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Текст звіту скопійовано в буфер обміну 📋');
    } catch {
      toast.error('Не вдалося скопіювати. Виділіть текст вручну.');
    }
  };

  const handleSave = () => {
    onSave(content.trim());
    toast.success('Звіт збережено ✅');
    onClose();
  };

  const isSent = !!report.sentAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in duration-200 border border-slate-200 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{student.name}</h2>
              <p className="text-xs text-slate-500">Звіт за період: {report.period}</p>
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

        {/* Textarea */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Текст повідомлення для батьків
            </span>
            <VoiceInputButton
              onTranscript={(t) => setContent((prev) => prev ? `${prev} ${t}` : t)}
              size="sm"
            />
          </div>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed text-slate-800"
            placeholder="Вставте або надиктуйте текст звіту для батьків..."
          />
          {report.updatedAt && (
            <p className="text-[11px] text-slate-400">
              Оновлено: {new Date(report.updatedAt).toLocaleString('uk-UA')}
              {report.sentAt && (
                <span className="ml-2 text-emerald-600">
                  · Надіслано: {new Date(report.sentAt).toLocaleString('uk-UA')}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleSent}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-xs ${
              isSent
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={isSent ? 'Скасувати відмітку «Надіслано»' : 'Позначити як надіслано батькам'}
          >
            {isSent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
            {isSent ? 'Надіслано' : 'Позначити як надіслано'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Скопіювати
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 shadow-sm"
            >
              Зберегти зміни
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
