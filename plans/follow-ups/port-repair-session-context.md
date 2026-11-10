# Server-report failures enter session chat

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from PR #154, review finding 4.
- **Location:** `worker/chat/runner-event-identity.ts:39`, `worker/chat/runner-refusal.ts:21`, `worker/chat/turn-context.ts:26`, `src/shell/workspace/tools/tool-events.ts:25`, and `worker/chat/runner-refusals.test.ts:193`.
- **Reason:** The trigger needs malformed input. The two feature fix rounds are used.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Port report:** A `ports.updated` event that lists the servers of one workspace.
  - **Refusal marker:** A stored `runner.event-refused` event that records a refused runner event.
  - **Event scope:** Whether an event belongs to the workspace or to one turn of a session.
  - **Turn event context:** The session and turn fields required by the shared `TurnEventContext` type.
- **Background:**
  - Conductive shows running servers in Preview. Port reports belong to the workspace and have no session.
  - A refused port report starts a request for a fresh report. If that replacement also fails, Preview shows a notice beside its saved data.
  - The real runner sends no session fields in a port report. A faulty or forged event can still contain them.
  - The identity reader recognizes `ports.updated`, but the refusal handler's separate workspace-event list omits it.
  - For an event outside that list, `verifiedTurn` can use its raw session and turn IDs when they match a stored turn.
  - The shared event types already distinguish events that carry turn context from workspace events.
- **Problem:** Send an invalid `{ type: 'ports.updated', ports: null, sessionId, turnId }` with IDs that match a stored turn. The port parser refuses the null list. The refusal marker then names that session and turn. A second refused report gets `repairFailed: true` with the same session context. Chat shows the marker, and Preview ignores its failed-repair notice.
- **Impact if no action:** Preview can retain an old server list without its required warning. Chat receives a failure that belongs to no session.
- **Root question:** How must server-list failures stay with Preview?
- **Options:**
  - **A.** Add `ports.updated` to the workspace-event list. Extend the existing refusal-context test with malformed port reports. This keeps two event lists. Effort: Small.
  - **B.** Define each known event's scope once in the identity reader. Use that scope for refusal context. Preserve the current handling of unknown events. Extend the existing refusal-context test. A manual table can still miss a new type or assign the wrong scope. Effort: Small.
  - **C.** Split workspace-report and turn-event receipt handling before refusal creation. Workspace reports then cannot receive turn context. This changes more receipt code and still needs a scope classification. Effort: Medium.
  - **D.** Derive the required scope from the shared event types. Give the identity reader one table keyed by `RunnerEvent['type']`. Type each value as `turn` when that event carries `TurnEventContext`, or `workspace` otherwise. Return that scope from the reader. Read turn context only for turn events. Unknown types must retain their current verified-turn behavior. Extend the existing refusal-context test with malformed port reports and a refused `files.unavailable`, both naming the active turn. Update the identity-reader entry in `worker/chat/README.md`. Effort: Small.
- **Left out:**
  - Change nothing: the required notice stays missing.
  - A browser-only correction: A is smaller and also corrects the stored marker that each tab replays.
  - Correct markers only during history reads: the live send and stored attribution remain wrong.
  - Change the runner: it already sends no session fields, and the Worker still receives faulty or forged events.
  - Reject workspace events with session fields: rejection alone does not give the refusal marker its correct context. A new rejection also needs user approval.
  - Add a channel or envelope field for turn context: it changes the protocol for this rare input. D uses the existing event types.
  - Copy scope from the full payload parser: D gives the same source with a smaller change. The identity reader would otherwise keep its own recognition list.
  - Test every workspace event type: this is a test for the class and needs user approval. D uses the existing typecheck and adds no gate.
- **Wider fix:** D. The typed table follows the shared event contract and cannot omit a known type or assign its wrong scope. It removes the separate refusal list.
- **Previous examples:** Commit `40796970` added the corresponding `workspace.title` refusal-context case. Commit `277cd448` added `files.unavailable` to the identity reader without adding it to the refusal list.
- **Recommendation:** D. The independent check changed the first recommendation from B. D keeps the same Small effort and makes the table follow the shared types.
- **Action:** fix after merge, apply D, because the trigger needs malformed input and the two feature fix rounds are used.

The refusal must still produce one stored marker and the existing repair request.
Unknown event types must keep verified turn context because they can be newer turn events.
The browser continues to route markers by their stored session field.

The existing main code also misattributes a refused `files.unavailable` that names a stored turn.
It has the same cause, and D fixes it through this same item.
Keep its coverage in the existing refusal-context test instead of adding a class-wide test.

[Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates) states that workspace reports have no session and that failed repair needs a notice.
[Chat and events](../../docs/protocol/chat-and-events.md) states that a lost workspace update shows no chat line.
[Port previews](../../docs/protocol/port-previews.md) gives the location of the server-list notice.
