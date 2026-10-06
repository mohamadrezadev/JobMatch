## Why

The supplied JobMatch MVP PRD requires a persistent real-data flow from Persian career chat to job-specific downloadable resume. Existing chat/discovery/run infrastructure is present, but onboarding can partially save, recommendations return newest jobs, UI filters only 50 rows, dashboard redirects, resume claims are incompletely guarded and PDF downloads return JSON.

## What Changes

Complete atomic onboarding and profile restoration, validated backend job filtering/pagination, explainable matching with work type and unknown states, feedback controls and personalized recommendations, authenticated aggregated dashboard, owned persisted resume editing and backend PDF, real persisted settings, funnel events, and removal of Academy navigation. Keep existing chat/discovery and legacy resume routes compatible.

## Capabilities

### New Capabilities
- `mvp-completion`: End-to-end persistent job discovery, decision and preparation flow.

### Modified Capabilities

None; existing change specs remain historical. The new capability defines integration requirements.

## Impact

Backend jobs/matching/users/resume/feedback modules, new onboarding/dashboard/analytics endpoints, Prisma additive migration, frontend onboarding/profile/settings/jobs/dashboard/resume, authentication store and navigation. Uses the existing PDF dependency and bundled Persian font.

## Problem

Users cannot complete the supplied PRD's definition of done reliably with the current implementation.

## Scope

In: PRD release requirements and regression of existing chat/discovery. Out: Academy, employers, payments, automatic applications, notification delivery, advanced ML and structured employment verification.

## API Contract

`POST /api/onboarding/complete`; `GET /api/jobs/search` with q/role/location/workType/experienceLevel/minimumSalary/skills/page/pageSize; authenticated `GET /api/jobs/recommended`; `GET /api/dashboard`; `GET/PUT /api/users/preferences`; `GET /api/resumes`, `GET/PUT /api/resumes/:id`, `GET /api/resumes/:id/pdf`; `POST /api/analytics/events`. Preserve existing job-based `/api/resume` routes. JSON uses `{success,data}`; PDF uses binary application/pdf.

## Acceptance Criteria

A new account saves all onboarding fields atomically; queries filter in the database with correct totals; match scores describe unknown fields; feedback changes ranking after three distinct jobs with bounded modifiers; dashboard displays actual owned data; saved resumes survive refresh and cannot gain unsupported AI claims; downloaded files are real PDFs; ordinary navigation contains no demo substitutions or Academy; tests and builds pass. Live smoke results must be recorded separately from mocked checks.
