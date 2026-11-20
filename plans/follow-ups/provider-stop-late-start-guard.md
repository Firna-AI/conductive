# Late starts can end continuation chains early

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-20, from review finding 5 on `calummoore/resuming-agent-on-timeout-fg44`.
- **Location:** `worker/chat/turn-chain.ts`, `worker/chat/workspace-stop.ts`, `worker/chat/provider-recovery.ts`.
- **Reason:** Recovery input selection waits for a runner connection, but the continuation guard decides whether to start that connection's computer earlier.

**Terms**

- **Continuation:** A turn that resumes work after an unexpected stop of its cloud computer.
- **Start acknowledgement:** The runner's `turn.started` event, which can remain unsent while the agent works.

**Background**

The [provider-stop requirements](../../docs/protocol/provider-stops.md#the-end-of-a-chain) require 15 minutes of actual continuation execution before another automatic continuation.
The Worker stores that start time in `StoredTurn.providerContinuationStartedAt`.
The field is null before the Worker receives the start acknowledgement.
The runner can save this acknowledgement and start the agent while its connection is down.

If a provider stop comes before acknowledgement delivery, `continuationWithinLimit` treats the turn as never started.
The chain ends with no successor, even after at least 15 minutes of actual work.
This behavior is visible in the null check in `worker/chat/turn-chain.ts` and the eligibility check in `worker/chat/workspace-stop.ts`.

`provider-recovery.ts` stores replayed start evidence for an already-approved successor.
It cannot correct this earlier guard decision when no successor exists.
The [runner requirements](../../docs/protocol/agent-runner.md#the-agent-runner) also allow restart ends with `filesUnavailable: true`.
That end proves a start but supplies no actual start timestamp.

**Task**

Design recovery for an unknown continuation start before guard eligibility becomes final.
Use the actual replayed start timestamp when it exists.
Keep the requirement that a continuation with less than 15 minutes of execution starts no further automatic continuation or computer.
Define how recovery obtains missing evidence when the computer is stopped.
Ask for a product decision before changing that start requirement.
Add a regression test with a buffered start acknowledgement and at least 15 minutes of real work in the test clock.
Keep the existing boundary tests for shorter work and a continuation that never started.

**Impact if no action**

A rare lost acknowledgement can stop automatic work early.
A member must send a message to continue.

**Needs**

A design that obtains start evidence without bypassing the automatic-start guard.
No requirement change has been approved.

**Done when**

Late start acknowledgements no longer cause an eligible continuation to end its chain early.
The tests still reject automatic continuation and automatic computer start below the 15-minute boundary.
