export interface DiscoveryWave {
  sources: string[];
  queryTitles: string[];
  fetchCeiling: number;
}

// The configured order is the initial preference, not a measured source score.
export function discoveryWaves(
  sources: string[],
  rounds: string[][],
): DiscoveryWave[] {
  if (!rounds.length) return [];
  return [
    { sources: sources.slice(0, 2), queryTitles: rounds[0], fetchCeiling: 3 },
    { sources: sources.slice(2), queryTitles: rounds[0], fetchCeiling: 3 },
    ...[5, 8, 10].map((fetchCeiling) => ({
      sources: [...sources],
      queryTitles: rounds[0],
      fetchCeiling,
    })),
    ...rounds.slice(1, 4).map((queryTitles) => ({
      sources: [...sources],
      queryTitles,
      fetchCeiling: 10,
    })),
  ].filter((wave) => wave.sources.length > 0);
}

export interface SourceMetrics {
  searchMs: number;
  validationMs: number;
  fetchMs: number;
  parseMs: number;
  aiMs: number;
  filterMs: number;
  searchCalls: number;
  urlsFetched: number;
  jobsExtracted: number;
  aiCalls: number;
  duplicates: number;
  timeouts: number;
}

export function emptySourceMetrics(): SourceMetrics {
  return {
    searchMs: 0,
    validationMs: 0,
    fetchMs: 0,
    parseMs: 0,
    aiMs: 0,
    filterMs: 0,
    searchCalls: 0,
    urlsFetched: 0,
    jobsExtracted: 0,
    aiCalls: 0,
    duplicates: 0,
    timeouts: 0,
  };
}

export interface DiscoverySummary {
  totalMs: number;
  reason: string;
  confirmedJobs: number;
  candidateJobs: number;
  waves: number;
  sources: {
    source: string;
    found: number;
    accepted: number;
    rejected: number;
    metrics?: SourceMetrics;
  }[];
}

export function mergeSourceMetrics(
  a?: SourceMetrics,
  b?: SourceMetrics,
): SourceMetrics | undefined {
  if (!a && !b) return undefined;
  const merged = emptySourceMetrics();
  for (const key of Object.keys(merged) as (keyof SourceMetrics)[])
    merged[key] = (a?.[key] ?? 0) + (b?.[key] ?? 0);
  return merged;
}
