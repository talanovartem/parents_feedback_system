import { describe, expect, it } from 'vitest';
import { getActiveCriteria, getLegacyScoresTitle, getReportCriteria, getScoringScores } from './assessmentCriteria';

const criteria = [
  { id: 'behavior', name: 'Поведінка' },
  { id: 'condition', name: 'Стан дитини' },
  { id: 'efficiency', name: 'Працездатність' },
  { id: 'activity', name: 'Активність' },
  { id: 'grade', name: 'Оцінка за урок' },
];

describe('assessment criteria', () => {
  it('shows one combined entry field while preserving the other columns', () => {
    expect(getActiveCriteria(criteria).map(({ id, name }) => [id, name])).toEqual([
      ['efficiency', 'Робота на уроці'],
      ['activity', 'Ініціативність'],
      ['grade', 'Оцінка за урок'],
    ]);
    expect(criteria[2].name).toBe('Працездатність');
  });

  it('keeps historical criteria visible in reports', () => {
    expect(getReportCriteria(criteria).map(({ name }) => name)).toEqual([
      'Поведінка (історичні оцінки)',
      'Стан дитини (історичні оцінки)',
      'Робота на уроці',
      'Ініціативність',
      'Оцінка за урок',
    ]);
    expect(getLegacyScoresTitle({ behavior: 7, condition: 9, efficiency: 8 })).toContain('Поведінка — 7; Стан дитини — 9');
  });

  it('does not hide the only available criterion in an older or custom list', () => {
    expect(getActiveCriteria([{ id: 'behavior', name: 'Поведінка' }])).toEqual([{ id: 'behavior', name: 'Поведінка' }]);
    expect(getLegacyScoresTitle({ efficiency: 8 })).toBeUndefined();
  });

  it('counts the combined work score once without changing archived values', () => {
    const oldScores = { behavior: 6, condition: 8, efficiency: 10, activity: 12 };
    expect(getScoringScores(oldScores, criteria)).toEqual({ efficiency: 10, activity: 12 });
    expect(oldScores.behavior).toBe(6);
    expect(getScoringScores({ behavior: 6, condition: 8 }, criteria)).toEqual({ efficiency: 7 });
  });
});
