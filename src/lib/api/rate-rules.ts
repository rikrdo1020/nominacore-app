import type { RateRule } from '../../types/api';

export function getRateRules(): Promise<RateRule[]> {
  return window.api.getRateRules();
}

export function updateRateRule(
  id: number,
  maxReg: number,
  regRate: number,
  otRate: number,
  lunchDuration: number
): Promise<{ success: boolean }> {
  return window.api.updateRateRule(id, maxReg, regRate, otRate, lunchDuration);
}
