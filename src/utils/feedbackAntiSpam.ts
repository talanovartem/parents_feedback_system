export interface AntiSpamResult {
  bonusGranted: boolean;
  message?: string;
}

/**
 * Перевіряє якість змістовного фідбеку учня:
 * - Мінімум 15 символів
 * - Захист від типових одноманітних відписок («все ок», «норм», «нічого» тощо)
 */
export function evaluateFeedbackQuality(text: string): AntiSpamResult {
  const trimmed = text.trim();

  if (trimmed.length < 15) {
    return {
      bonusGranted: false,
      message: 'Напишіть щонайменше 15 символів про те, що саме ви вивчили чи зробили на уроці, щоб отримати бонус ✨',
    };
  }

  // Очищення від розділових знаків для перевірки стоп-фраз
  const normalized = trimmed
    .toLowerCase()
    .replace(/[.,!?:;—\-()_+*/~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopPhrases = [
    'все ок',
    'все норм',
    'все добре',
    'все класно',
    'все гарно',
    'все супер',
    'все нормально',
    'все сподобалося',
    'все сподобалось',
    'все було добре',
    'все було норм',
    'нічого',
    'хз',
    'хз нічого',
    'норм',
    'ок',
    'клас',
    'добре',
    'не знаю',
  ];

  if (stopPhrases.includes(normalized)) {
    return {
      bonusGranted: false,
      message: 'Схоже на коротку відписку 💡 Напишіть конкретніше: яка саме дія, тема або приклад вам запам’яталися, щоб отримати бонус!',
    };
  }

  return {
    bonusGranted: true,
  };
}
