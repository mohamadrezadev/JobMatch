## ADDED Requirements

### Requirement: Unified run budget

`AgentSearchService` SHALL build a single `AgentRunBudget` value once per `runSearch` invocation, derived from the run's absolute deadline, the active source list, `MAX_SOURCE_FETCHES`, `MAX_AGENT_STEPS`, and the goal's target confirmed-job count. All per-run limits that `AgentSearchService` enforces SHALL read from this one value rather than from separately re-derived constants.

#### Scenario: Budget reflects the run's actual inputs

- **WHEN** a search run starts with a given deadline, an active source list, and a goal requesting N confirmed jobs
- **THEN** the constructed `AgentRunBudget` SHALL carry that same deadline, that same number of max sources, the existing `MAX_SOURCE_FETCHES` and `MAX_AGENT_STEPS` constants, and a target confirmed-job count equal to N (or the existing default when N is not a valid positive integer)

#### Scenario: Budget construction does not change existing stop semantics

- **WHEN** a run completes under the new budget-aware code path with no slow or failing sources
- **THEN** the run SHALL reach the same `FinishReason`, the same `partial` value, and the same confirmed job count it would have reached before this change, for identical inputs and timing

### Requirement: Bounded per-wave timeout

Each wave's batch cancellation timer SHALL be armed with a bounded fair share of the run's remaining time, computed from the number of waves still queued at that point, instead of the full remaining run deadline. The final wave SHALL be armed with the full remaining deadline, since no subsequent wave depends on time being reserved for it.

#### Scenario: Earlier wave does not consume the full remaining deadline

- **WHEN** a wave is not the last wave in the run and the provider call for that wave does not resolve on its own
- **THEN** that wave's batch SHALL be cancelled before the global run deadline is reached, leaving time for subsequent waves to execute

#### Scenario: Final wave still gets the full remaining budget

- **WHEN** the current wave is the last wave in the run's wave sequence
- **THEN** that wave's batch cancellation timer SHALL equal the full remaining time until the global deadline, matching today's behavior for the last wave

#### Scenario: Fast-finishing earlier waves bank time for later waves

- **WHEN** one or more earlier waves complete well before their allotted share of time
- **THEN** the fair-share calculation for each subsequent wave SHALL be based on the time actually remaining at that point, not a static division of the original total budget

#### Scenario: A per-wave timeout does not change the global stop reason

- **WHEN** a wave's batch is cancelled by the new bounded per-wave timer rather than by the global deadline or global abort signal
- **THEN** the affected sources in that wave SHALL be reported with the existing `TIMEOUT` source error code, and the overall run's `FinishReason` SHALL remain governed solely by the global deadline and global abort signal, exactly as before this change

### Requirement: Backward-compatible service construction

`AgentSearchService`'s public constructor signature SHALL remain unchanged by this capability. The run budget SHALL be constructed internally from existing call parameters, not supplied as a new required constructor argument.

#### Scenario: Existing call sites keep working unmodified

- **WHEN** `AgentSearchService` is constructed with only a provider and a planner, as `JobDiscoveryService` and existing tests already do
- **THEN** construction SHALL succeed and `runSearch` SHALL build its `AgentRunBudget` internally without requiring any additional argument
