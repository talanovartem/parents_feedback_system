import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AiQuickActionsProps {
  prompt: string;
  className?: string;
  compact?: boolean;
}

interface AiService {
  name: string;
  url: string;
  colorClass: string;
  hoverClass: string;
  bgClass: string;
  borderClass: string;
}

const AI_SERVICES: AiService[] = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    colorClass: 'text-emerald-700',
    hoverClass: 'hover:bg-emerald-100',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    colorClass: 'text-blue-700',
    hoverClass: 'hover:bg-blue-100',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/',
    colorClass: 'text-amber-700',
    hoverClass: 'hover:bg-amber-100',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
];

export const AiQuickActions: React.FC<AiQuickActionsProps> = ({
  prompt,
  className = '',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOnly = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Промпт скопійовано в буфер обміну!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не вдалося скопіювати текст');
    }
  };

  const handleOpenAi = async (service: AiService) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(`Промпт скопійовано! Відкриваємо ${service.name}...`);
      window.open(service.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Не вдалося скопіювати текст');
    }
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleCopyOnly}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          title="Скопіювати промпт у буфер обміну"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Скопійовано' : 'Копіювати'}
        </button>

        {AI_SERVICES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => handleOpenAi(s)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border ${s.borderClass} ${s.bgClass} ${s.colorClass} ${s.hoverClass} transition`}
            title={`Скопіювати промпт та відкрити ${s.name}`}
          >
            <span>{s.name}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyOnly}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопійовано в буфер!' : 'Скопіювати промпт'}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium mr-1 hidden md:inline flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Скопіювати і відкрити:
          </span>

          {AI_SERVICES.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => handleOpenAi(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border ${s.borderClass} ${s.bgClass} ${s.colorClass} ${s.hoverClass} shadow-sm transition active:scale-95`}
              title={`Скопіювати промпт та відкрити ${s.name}`}
            >
              <span>{s.name}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-75" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
