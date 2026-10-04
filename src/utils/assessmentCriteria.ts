import { Criterion } from '../types/feedback';

const hasCombinedCriterion = (criteria: Criterion[]) => criteria.some((criterion) => criterion.id === 'efficiency');

export function getActiveCriteria(criteria: Criterion[]): Criterion[] {
  const combined = hasCombinedCriterion(criteria);
  return criteria
    .filter((criterion) => !combined || (criterion.id !== 'behavior' && criterion.id !== 'condition'))
    .map((criterion) => ({
      ...criterion,
      name: criterion.id === 'efficiency' ? 'Робота на уроці'
        : criterion.id === 'activity' ? 'Ініціативність' : criterion.name,
    }));
}

export function getReportCriteria(criteria: Criterion[]): Criterion[] {
  const combined = hasCombinedCriterion(criteria);
  return criteria.map((criterion) => ({
    ...criterion,
    name: combined && (criterion.id === 'behavior' || criterion.id === 'condition')
      ? `${criterion.name} (історичні оцінки)`
      : criterion.id === 'efficiency' ? 'Робота на уроці'
        : criterion.id === 'activity' ? 'Ініціативність' : criterion.name,
  }));
}

export function getLegacyScoresTitle(scores: Record<string, number>): string | undefined {
  const details = [
    ['Поведінка', scores.behavior],
    ['Стан дитини', scores.condition],
  ].filter(([, score]) => typeof score === 'number' && Number.isFinite(score));
  return details.length ? `Історичні оцінки: ${details.map(([name, score]) => `${name} — ${score}`).join('; ')}` : undefined;
}

/** One score per visible column; archived values remain untouched in the saved record. */
export function getScoringScores(scores: Record<string, number>, criteria: Criterion[]): Record<string, number> {
  if (!hasCombinedCriterion(criteria)) return { ...scores };

  const { behavior, condition, ...activeScores } = scores;
  if (!Number.isFinite(activeScores.efficiency)) {
    const legacy = [behavior, condition].filter((score) => Number.isFinite(score));
    if (legacy.length) {
      activeScores.efficiency = legacy.reduce((sum, score) => sum + score, 0) / legacy.length;
    }
  }
  return activeScores;
}
