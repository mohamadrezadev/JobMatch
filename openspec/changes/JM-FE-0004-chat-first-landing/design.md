# Design

LandingPage uses a dedicated marketing header rather than the sample dashboard shell, with an inline reusable ChatExperience. ChatExperience selects GuestChat or the existing authenticated composer. The guest UI obtains its state from the server; it does not synthesize assistant responses. Guest drafts and a continuation marker use sessionStorage. On auth, the claim result is temporarily stored under an owner-scoped key so a failed history fetch can be retried without losing the imported conversation ID. Pending draft text is not auto-sent. Import errors block further sends and offer retry.

The guest quota is explicitly five successful messages; login/registration actions appear at exhaustion. /dashboard redirects to the new root, shell navigation says Start conversation, and guest profile cards no longer show the reference persona. Internal legacy reference file/component names are retained as provenance; no reference dashboard remains routed.

No e2e framework is scaffolded. Use existing standalone Chrome checks plus co-located unit tests and HTTP integration tests.
