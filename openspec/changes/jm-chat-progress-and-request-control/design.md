# Design

An additive request-gate table stores opaque identity key, lease UUID, expiry and next allowed time. Reserve/update inside a Prisma transaction under a PostgreSQL transaction advisory lock keyed by identity. Authenticated run creation reserves and inserts atomically. Finish releases atomically with the terminal event; legacy routes and guest requests release in finally. Default lease is three minutes; post-search pause is fifteen seconds and server-configurable within five through sixty seconds. A lease UUID acts as a fencing token.

The public availability endpoint reads server timestamps; admission remains authoritative when a stale client submits. Existing authenticated run reuse loads its original conversation and event history without discarding a different submitted draft. Guest active work is restored by polling committed state, not resending. Existing IP throttles remain supplemental, not claimed to be distributed.

Build a shared timeline from event history rather than timers. Each source retains its own observed phases; parallel callbacks may interleave. Public issue metadata adds a known failing stage. Never invent a failing phase for an overall unknown timeout. Compact summaries and per-source timelines replace noisy repetition, with detailed source explanations retained.
