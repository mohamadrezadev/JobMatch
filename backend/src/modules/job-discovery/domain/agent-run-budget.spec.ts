import {
  buildAgentRunBudget,
  MIN_WAVE_TIMEOUT_MS,
  waveTimeoutMs,
} from "./agent-run-budget";

describe("buildAgentRunBudget", () => {
  it("carries the run's actual inputs", () => {
    const budget = buildAgentRunBudget(
      123456,
      ["jobinja.ir", "jobvision.ir"],
      10,
      4,
      7,
    );
    expect(budget).toEqual({
      deadline: 123456,
      maxSources: 2,
      maxSteps: 4,
      maxFetchesPerSource: 10,
      targetConfirmedJobs: 7,
    });
  });
});

describe("waveTimeoutMs", () => {
  const budget = buildAgentRunBudget(0, ["a", "b", "c", "d"], 10, 4, 5);

  it("gives an earlier wave a fair share of the remaining time", () => {
    const now = 0;
    const deadline = 60000;
    const b = { ...budget, deadline };
    // wave 0 of 6: fair share = 60000 / 6 = 10000, below the 20000 floor.
    expect(waveTimeoutMs(b, 0, 6, now)).toBe(MIN_WAVE_TIMEOUT_MS);
  });

  it("gives the final wave the full remaining time", () => {
    const now = 40000;
    const deadline = 60000;
    const b = { ...budget, deadline };
    expect(waveTimeoutMs(b, 5, 6, now)).toBe(20000);
  });

  it("never exceeds the time actually remaining", () => {
    const now = 55000;
    const deadline = 60000;
    const b = { ...budget, deadline };
    // Only 5s left; even the floor must not exceed it.
    expect(waveTimeoutMs(b, 0, 6, now)).toBe(5000);
  });

  it("banks time from fast-finishing earlier waves for later ones", () => {
    const deadline = 160000;
    const b = { ...budget, deadline };
    // Still 150s left with 5 waves to go (started at step 1 of 6 -> waveIndex 1):
    // fair share = 30000, above the floor, so banked time is reflected directly.
    const now = 10000;
    expect(waveTimeoutMs(b, 1, 6, now)).toBe(Math.ceil(150000 / 5));
  });

  it("respects the floor when remaining time divided across waves is small", () => {
    const deadline = 30000;
    const b = { ...budget, deadline };
    const now = 0;
    // 30000 / 3 remaining waves = 10000, below the floor, remaining time allows the floor.
    expect(waveTimeoutMs(b, 0, 3, now)).toBe(MIN_WAVE_TIMEOUT_MS);
  });
});
