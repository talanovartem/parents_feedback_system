import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { SavedReport } from '../../types/feedback';

interface CopySavedReportButtonProps {
  report: SavedReport;
  studentName: string;
  className?: string;
  label?: string;
}

export function CopySavedReportButton({ report, studentName, className = '', label }: CopySavedReportButtonProps) {
  const title = `Скопіювати звіт для ${studentName} за період ${report.period}`;

  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(report.content);
          toast.success(`Звіт для ${studentName} скопійовано`);
        } catch {
          toast.error('Не вдалося скопіювати звіт');
        }
      }}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 rounded-lg ${label ? 'px-2.5 py-1.5' : 'p-1.5'} text-indigo-700 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${className}`}
    >
      <Copy className="h-3.5 w-3.5" />
      {label && <span className="text-xs font-semibold">{label}</span>}
    </button>
  );
}
