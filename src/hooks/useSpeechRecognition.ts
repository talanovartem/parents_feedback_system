import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseSpeechRecognitionOptions {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onTranscript,
  lang = 'uk-UA',
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ігноруємо помилки якщо вже зупинено
      }
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Ваш браузер не підтримує розпізнавання мови. Спробуйте Chrome, Safari або Edge.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Доступ до мікрофона заборонено. Дозвольте доступ у налаштуваннях браузера.');
        } else if (event.error === 'no-speech') {
          // Мовлення не виявлено - спокійно зупиняємося
        } else {
          toast.warning('Не вдалося розпізнати мову. Спробуйте ще раз.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error('Помилка активації мікрофона.');
    }
  }, [lang, onTranscript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
