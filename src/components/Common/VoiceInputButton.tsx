import React from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className = '',
  size = 'sm',
  title,
}) => {
  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    onTranscript,
  });

  if (!isSupported) return null;

  const sizeClasses = size === 'sm' ? 'p-1 w-6 h-6' : 'p-1.5 w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleListening();
      }}
      title={
        title ||
        (isListening
          ? 'Запис голосу активний... Натисніть, щоб зупинити'
          : 'Надиктувати голосом (українська мова)')
      }
      className={`rounded-lg flex items-center justify-center shrink-0 transition-all ${
        isListening
          ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400 animate-pulse'
          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
      } ${sizeClasses} ${className}`}
    >
      {isListening ? (
        <MicOff className={`${iconSize} text-rose-600 animate-bounce`} />
      ) : (
        <Mic className={iconSize} />
      )}
    </button>
  );
};
