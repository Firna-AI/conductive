# Provider stops

This page belongs to the [chat backend](README.md).
[Provider stops](../../docs/protocol/provider-stops.md) states the requirements.

`workspace-stop-hooks.ts` forwards the lifecycle's provider stop flag to
`WorkspaceOperations.stop`. The stop closes the runner first.
`observeProviderStopPermissions` reads each eligible turn's login before
the stop transaction. It uses `SessionLogins.observe`, as late answers do.
Each continuation keeps the interrupted turn's sender.

`stopDispatchedTurns` continues only running turns without a Stop request,
session close, or login failure. Other dispatched turns keep their existing
end behavior. Queued turns stay queued and request no automatic start.
Each eligible turn ends as stopped with `cloud_computer_stopped`, also when
its login or a time limit prevents continuation.

`prepareProviderContinuation` inserts the new turn before existing waiting
work. It copies pending member commands before the old end removes them.
A turn that the Worker never dispatched remains queued with its original
messages. A stored start acknowledgement proves that the agent started,
so its successor gets the hidden message with a fresh random ID prefixed
by `continuation:`.

A dispatched `turn` command that still waits for acknowledgement leaves
the start uncertain. The successor keeps its original messages and stores
`providerRecovery`. `commandDispatchState` blocks its commands before
payload preparation. Replayed `turn.started` events and a terminal
`turn.completed` with `filesUnavailable: true` prove that the old agent
started. The old turn's end is the barrier that completes this choice.
The pending choice and its received-message evidence survive object eviction.

With start proof, `observeProviderRecovery` prepends the hidden app message
and keeps only unanswered member commands. Without start proof, it releases
the original messages unchanged. The late end stays in history and never
changes the old turn's saved end. The atomic stop transaction keeps one
successor per source turn. Duplicate events add no hidden message.

The hidden message has a normal sender and message state for older CLI
readers. No `message.accepted` event exposes it. Before input selection,
the first original message stays first, including after a replayed start.
A failure before selection therefore retries that original message.

Try again of a failed continuation sends the same text in another hidden
message with a fresh prefixed ID. It acts for the member who retries and
keeps the failed turn's chain start. The normal login rules can open a
linked session. Neither its accepted events nor its reply adds the hidden
text to the chat or uses it as a session title.

`turn.continued` names the session, old turn, successor or null, and `next`.
Its values are `turn`, `reconnect`, and `message`. It carries no text.
The shared session event filter keeps it. The summary treats it as metadata,
so the event alone sets no unread mark.

## Time limits

`turn-chain.ts` finds the newest member message and keeps its timestamp in
`StoredTurn.chainStartedAt`. It ignores `continuation:` and `secret-notice:`
messages. A late-answer-only turn starts its chain when that turn is created.
Older turns derive their anchor from stored messages or their start time.
A stop at or after 30 days queues no continuation.

`providerContinuationStartedAt` is absent on ordinary turns, null on a
continuation before runner start, and the runner start time after that event.
`StoredTurn.started` records dispatch evidence and cannot supply this guard.
A continuation needs at least 15 minutes of runner execution before another
provider continuation. A real member message resets both limits.

## Interrupts and automatic start

The stop transaction stores the old turn's interrupt before successor
commands. Ordered dispatch permits that interrupt after the old turn ends.
Its late runner end removes the interrupt without changing the saved end.
`runner.ready` carries no active turn list and removes no interrupt.

`ProviderStopStarts` stores `chat:v1:provider-stop-start` and the due marker
`alarm:lifecycle:provider-stop` in the same transaction as the successor.
After commit, the shared alarm scheduler sets the physical alarm.
A failed stopped publication remains recoverable through the lifecycle's
changed-publication retry.

The [lifecycle alarm](../lifecycle/workspace-object.md#provider-stops) checks
the queued turns and resumes for a remaining turn's sender outside the chat
queue. Stop can cancel queued work before that alarm. A refused start drops
the request and leaves the continuation queued. A transient failure keeps
the request for a later alarm. So does a workspace row that does not show
the stop yet, because its projection can lag behind the lifecycle.

## Tests

`provider-stop.test.ts` checks multiple sessions, unanswered input, repeat
handling, and a turn that the runner never started.
`provider-stop-collision.test.ts` checks member IDs in running and waiting
turns, repeat stops, and later input delivery. `provider-continuation-retry.test.ts`
checks hidden retries and their chain start in the same session and a
linked session. The app's `continuation-retry.test.ts` checks that a linked
retry reply stays hidden.
`provider-stop-access.test.ts` checks excluded turns, queued work, and login
or sender loss. `provider-stop-limits.test.ts` checks both time limits and
member resets. `provider-stop-late-answer.test.ts` checks app-only anchors.
`provider-stop-dispatch.test.ts` checks interrupt acknowledgement and waiting
turn order. `provider-stop-evidence.test.ts` checks replayed start evidence,
the old-end barrier, restart-end evidence, and unchanged messages after a
lost dispatch. `provider-stop-pending-retry.test.ts` checks retry identity
when a successor fails before input selection. `workspace-summary.test.ts`
checks the session event and unread projection. The lifecycle's
`provider-stop-start.test.ts` checks durable
resume, cancellation, refusal, transient recovery, and a lagging row.
