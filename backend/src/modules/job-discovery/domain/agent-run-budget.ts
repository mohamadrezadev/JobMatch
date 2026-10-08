export interface AgentRunBudget {
  deadline: number;
  maxSources: number;
  maxSteps: number;
  maxFetchesPerSource: number;
  targetConfirmedJobs: number;
}

// A single wave's batch timer is never below one fetch's own timeout worth of
// time, so the fix cannot cut a source off before its first fetch could even
// time out on its own.
export const MIN_WAVE_TIMEOUT_MS = 20000;

export function buildAgentRunBudget(
  deadline: number,
  sources: readonly string[],
  maxFetchesPerSource: number,
  maxSteps: number,
  targetConfirmedJobs: number,
): AgentRunBudget {
  return {
    deadline,
    maxSources: sources.length,
    maxSteps,
    maxFetchesPerSource,
    targetConfirmedJobs,
  };
}

// Bounds a wave's batch cancellation timer to a fair share of the time still
// remaining, computed from the waves still queued at this point, so a single
// hanging wave cannot consume nearly the whole run deadline and starve the
// waves behind it. The last wave gets whatever time is left: nothing depends
// on time being reserved beyond it.
export function waveTimeoutMs(
  budget: AgentRunBudget,
  waveIndex: number,
  totalWaves: number,
  now = Date.now(),
): number {
  const remaining = Math.max(1, budget.deadline - now);
  const remainingWaves = Math.max(1, totalWaves - waveIndex);
  const isLastWave = waveIndex >= totalWaves - 1;
  const fairShare = isLastWave
    ? remaining
    : Math.ceil(remaining / remainingWaves);
  return Math.min(remaining, Math.max(MIN_WAVE_TIMEOUT_MS, fairShare));
}
