import { describe, it, expect } from 'vitest';
import { evaluateFeedbackQuality } from './feedbackAntiSpam';

describe('feedbackAntiSpam', () => {
  it('rejects short text under 15 characters', () => {
    const res = evaluateFeedbackQuality('Нормально');
    expect(res.bonusGranted).toBe(false);
    expect(res.message).toContain('15 символів');
  });

  it('rejects typical uninformative phrases even if padded', () => {
    const res1 = evaluateFeedbackQuality('все було добре...');
    expect(res1.bonusGranted).toBe(false);

    const res2 = evaluateFeedbackQuality('все сподобалося!');
    expect(res2.bonusGranted).toBe(false);
  });

  it('grants bonus for meaningful feedback', () => {
    const res = evaluateFeedbackQuality('Сьогодні навчився знаходити площу трикутника за формулою Герона.');
    expect(res.bonusGranted).toBe(true);
    expect(res.message).toBeUndefined();
  });
});
