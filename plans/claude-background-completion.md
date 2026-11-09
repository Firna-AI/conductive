# Keep Claude background results out of user turn completion

Status: Active. On branch `calummoore/conductive-session-stoppage`, no pull request yet. The pull request that completes the work deletes this plan.

The user asked for this fix on 9 November 2026 after the session investigation.
The runner accepted an empty successful completion while Claude restored a notification about an old background task.
The accepted user message received no answer.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#what-the-chat-shows).
- [Agent runner](../runner/README.md).

## Design

Design call, 9 November 2026: distinguish Claude SDK background-task results at the provider adapter.
The SDK already identifies the origin of a result.
This preserves the existing requirement that an answer belongs to the user messages it answers.
The internal provider result and the browser event formats stay compatible.
The fix must keep normal user results, genuine provider errors, Stop, and queued messages working.

Reject an output-text heuristic because a legitimate result can have no assistant text.
Reject an SDK upgrade as the direct fix because the pinned SDK already reports result origins.
Do not add automatic message retries or a new user-visible error policy.
The exact SDK result of the original incident was not retained.
The regression reproduces its observed event order with the documented background-result origin.

## Milestone 1: Documentation alignment

Depends on: none

- [ ] Confirm the existing chat requirements cover message ownership and synthetic SDK messages.
- [ ] Update the runner README with the adapter's handling of background-task results.

## Milestone 2: Completion handling

Depends on: 1

- [ ] Add a regression through the runner and the fake Claude SDK for a resumed session with a background result before the user's answer.
- [ ] Observe its assertion fail before the fix.
- [ ] Handle background-task results without ending or acknowledging the active user message.
- [ ] Keep normal completion, failures, and queued input working.
- [ ] Run the focused checks and repeat the new asynchronous regression ten times.

## Milestone 3: Verification and review

Depends on: 1 and 2

- [ ] Run the early checks and complete repository gate.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete diff against `origin/main` with the implementation-review skill after the push.
- [ ] Apply confirmed findings and complete the required review rounds.
- [ ] Delete this plan after the preceding work completes.
- [ ] Open a pull request with the dated design call and a permalink to this plan.

Evidence stays under `.context/session-completion-fix/`.
