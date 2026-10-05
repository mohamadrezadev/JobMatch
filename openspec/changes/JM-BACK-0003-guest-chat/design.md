# Design

GuestChatService depends on a repository port and domain extraction/reply helpers. PrismaGuestConversationRepository stores GuestChatSession separately from user conversations. A compare-and-swap update checks the old turn count, unclaimed state, expiry and quota. Claim updates ownership and creates the existing Conversation and ordered ConversationMessage records in one database transaction; its version equals the imported turn count so subsequent authenticated sends continue sequencing.

Cookie tokens contain 256 random bits and only their SHA-256 hash is stored. The cookie path is restricted to guest API routes. No request can supply a user identity for claim. The presentation layer checks input, JWT, Origin and a bounded request-rate map. Storage is durable across application restarts; expired guest sessions are lazily purged on session creation.
