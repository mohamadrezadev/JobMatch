# Opportunities filters and pagination usability

## Problem
City and work type share one control while duplicated filters can override each other. Unlabelled fields send requests while typing. Active chips omit most filters. Plain pagination sits below both list and detail and provides weak navigation feedback.

## Scope
Simplify JobsView controls, expose optional filters progressively, apply drafts explicitly, show removable active filters, and put accessible numbered pagination beneath the list. Improve loading and empty states. Backend contracts and job detail actions remain in scope only for compatibility checks; no API or database changes.

## API Contract
Continue GET /api/jobs/search with page, pageSize=12, q, location, workType, experienceLevel, role, skills and minimumSalary. Consume items, pages and optional total. Apply filters and page=1 in one state update cycle.

## Acceptance Criteria
- Separate labelled search, city and work type controls; optional fields under an expandable section.
- Draft changes send no request until submit by button or Enter.
- Every active filter is visible and removable; clear all resets filters and page.
- Numbered pagination indicates current page and disables navigation while loading and at boundaries.
- Loading, empty and failed states are distinct; failed page navigation can be retried.
- RTL, mobile layout and keyboard operation remain usable.
