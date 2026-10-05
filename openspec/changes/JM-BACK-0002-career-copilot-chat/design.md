# Design

Domain is framework-free. Application depends on a repository port. Infrastructure owns Prisma transactions. Presentation owns JWT, validation, Swagger and HTTP error mapping.

Context separates searchContext from candidateFacts. Candidate facts are explicit user assertions with source text, not independently verified credentials. Existing Profile/UserSkill tables are unchanged.

Conservative rule extraction supports documented Persian examples and common English equivalents without an external service. Normalize Persian/Arabic digits, letters and ZWNJ. Clarify unsupported requests; never infer candidate experience from projects. This bounded extractor can later be replaced with an adapter after truthfulness tests pass.

Required conversation ownership follows project security rules despite the PRD's optional userId. Optimistic version comparison prevents silently lost updates; transaction rolls back both messages on failure. Message sequence guarantees stable history ordering. Only targetRoles gates readiness. Replies never claim discovery actually ran.

Migration is additive. Apply explicitly to a configured database after generation/validation. No production migration is performed automatically.

## Required startup fixes
The initial repository imported an undeclared @nestjs/config dependency, provided Prisma only in AppModule (not visible to feature modules), and had no registered JWT Passport strategy. Add the missing dependency, a global exported PrismaModule, and access-token validation with owner lookup. Auth responses now use the existing TransformInterceptor to match the login store's success/data contract. Export the existing MatchBreakdown interface to unblock TypeScript declaration generation. Initialize the existing resume client only when generating a resume so chat startup does not require an OpenAI key. These changes do not add resume behavior.

## Initial extractor limits
This phase supports documented examples and a bounded vocabulary of roles, skills and cities. Unknown titles or ambiguous language are clarified. excludedCompanies and free-form keyword extraction remain future enhancements; the optional fields are present in the backend contract. General career questions are classified but not answered by an LLM.