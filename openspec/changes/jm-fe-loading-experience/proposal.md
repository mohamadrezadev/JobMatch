# Consistent loading experience

## Problem
Workspace pages expose plain waiting text or empty editable forms while data is pending. Submission buttons lack visual activity and resume actions share a vague processing label.

## Scope
Shared accessible loading indicators, content-shaped skeletons, initial data loading on dashboard/profile/settings/resume/chat/jobs, route loading boundaries and submission feedback for account/onboarding/resume operations. Preserve existing request lifecycles and streamed discovery stages. No backend, dependency or API changes.

## API Contract
No changes. Loading begins and ends with actual existing requests and hydration. Existing failures and retry actions remain visible after completion.

## Acceptance Criteria
- Every affected initial data request shows a consistent indicator with a relevant explanation and content-shaped skeleton.
- Account forms are not shown blank while initial saved data is pending.
- Busy submissions show activity, prevent duplicate clicks and recover after success or failure.
- Resume feedback distinguishes load/save/generate/accept/PDF operations.
- Streamed search indicators animate only during active runs and display existing actual stages.
- Indicators respect reduced-motion preferences, have one polite status message, and show no fake progress percentage.
- Slow requests get a neutral waiting explanation without claiming invented milestones.
