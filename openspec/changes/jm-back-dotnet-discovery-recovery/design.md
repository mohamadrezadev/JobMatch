# Design

Introduce a pure, idempotent canonicalSearchIntent function in the chat domain. Recognize a compound Backend/.NET phrase only when removing the known occupation, technology and generic developer words leaves no unknown qualifier. Split it into Backend Developer and required .NET, preserve other fields and deduplicate roles without mutating the original intent.

Apply canonicalization after model-context validation, retaining candidate facts and understanding mode. Also apply it at query-round, query-generation and filter boundaries so stored conversations and direct discovery requests need no migration. Required technology remains a conjunction with occupation and city.

For Jobvision only, use site:jobvision.ir/jobs/ to favor actual vacancy pages. A real probe showed its existing local parser handles these detail pages without model extraction. No parser, provider timeout, URL validation or cancellation changes are needed for this recovery.

External page connection errors, empty responses and timeouts remain possible. Preserve confirmed results and report partial completion honestly. The live provider probe does not establish deployed chat behavior or guarantee ten vacancies.
