# Database
- [x] Add additive base/proposal tables and deploy migration without replacing existing resumes.

# Backend
- [x] Add owned base read/save with revision conflicts.
- [x] Generate independent grounded proposals with full job context and source snapshots.
- [x] Add proposal history and idempotent acceptance.
- [x] Preserve accepted editing, legacy records and PDF behavior.

# Frontend
- [x] Separate base editing from accepted per-job editing.
- [x] Show proposals, comparison, explicit acceptance and restored history.
- [x] Keep errors actionable and prevent generation from unsaved base edits.

# Validation
- [x] Test ownership, revision conflicts, source grounding and repeated acceptance.
- [x] Run a real browser/model/API/PDF journey proving regeneration preserves edits.
- [x] Record checks and limitations in delivery.md.
