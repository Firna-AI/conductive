# Refused tool parts trust forged session IDs

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/follow-up-server-report-failures-enter-4o27`, during its fix of the refusal context of server reports.
- **Location:** `worker/chat/runner-event-identity.ts:55`, `worker/chat/runner-event-identity.ts:84`, `worker/chat/runner-refusal.ts:21`, `worker/chat/turn-context.ts:26`, and `worker/chat/tool-detail-stream.test.ts:75`.
- **Reason:** The defect is older than the branch that found it and needs a malformed or forged part, and that branch fixed only workspace reports.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Tool-detail part:** A private `tool.detail.part` runner event with one piece of a long tool output, which the Worker joins into one public `tool.updated` event.
  - **Saved assembly:** The stored state of an unfinished tool update on one runner stream, with its session and turn, in `worker/chat/runner-output-state.ts`.
  - **Refusal marker:** A stored `runner.event-refused` chat event that records a refused runner event, its reason, and a verified session and turn, or null.
  - **Root IDs:** The `sessionId` and `turnId` fields at the top level of a runner event, beside its `type`.
  - **Verified pair:** A session ID and a turn ID that match a stored turn of that session in the same workspace, as `verifiedTurn` in `worker/chat/turn-context.ts` checks.
- **Background:**
  - The real runner puts `start` only on part 1 of a tool update, in `crates/cnd-runner/src/link/tool_detail.rs`. `start` holds the session, the turn, and the tool.
  - A later part carries only `type`, `detail`, `partNumber`, and `finalPart`. The shared type `RunnerToolDetailPart` in `src/shared/generated/RunnerToolDetailPart.ts` has an optional `start` and no root IDs.
  - `worker/chat/runner-receipt.ts` refuses a part at three steps:
    - the size and field checks of `parseRunnerEnvelope`
    - the order checks of `filterToolDetail`
    - the turn check of a part before the last
  - Each of these steps gives the raw event to `refuseRunnerEvent` in `worker/chat/runner-refusal.ts`.
  - `readRunnerEventIdentity` takes the scope of each known event type from its typed table `eventScopes`. The type `RunnerEventScopes` gives `turn` when the shared type has `TurnEventContext` at the root or in an optional `start`, and `workspace` otherwise. A `workspace` event gets null IDs.
  - `readRunnerEventIdentity` in `worker/chat/runner-event-identity.ts` gives a part the type `tool.updated` and the scope `turn`. It reads the IDs from `start` when `start` is an object, and from the root otherwise.
  - `refuseRunnerEvent` reads the saved assembly with `RunnerOutputState.toolContext` only when one of the two IDs is null. It then clears the tool source of the stream, and checks the IDs with `verifiedTurn`.
  - An accepted part never uses root IDs. `parseToolDetailPart` in `worker/chat/tool-detail-input.ts` drops them, and `filterToolDetail` takes the IDs from `start` or from the saved assembly.
  - [Agent runner](../../docs/protocol/agent-runner.md#the-agent-runner) requires verified session and turn IDs in a marker, or null when no verified context exists. It also requires the type `tool.updated` in the marker of a refused part.
  - [What the chat shows](../../docs/protocol/chat-and-events.md#what-the-chat-shows) requires one chat line for each refused runner event that is not a lost workspace update.
  - The browser shows a marker only in the session that it names, in `src/shared/transcript/session-events.ts`. It shows no line for a marker without a session.
- **Problem:** For a refused later part without `start`, the reader returns any two root ID strings, so `refuseRunnerEvent` does not read the saved assembly. When the root pair matches a stored turn of another session, the marker names that session. When the pair matches no stored turn, the marker names no session.
- **Impact if no action:** A faulty or forged part can show "A tool update was lost because it could not be read" in the wrong session. It can also hide that line from the session that lost the update.
- **Root question:** How does the lost line of a refused tool-detail part reach the session of its own tool update?
- **Options:**
  - **A.** In `refuseRunnerEvent`, take the IDs of a part without an object `start` only from the saved assembly. The reader still returns root IDs for such a part, so a later caller of the reader can repeat the error. Effort: Small.
  - **B.** Make `readRunnerEventIdentity` read the IDs of a part only from an object `start`. A later part then has null IDs, so the existing fallback reads the saved assembly. No type states where a part carries its IDs, so a new event with its IDs in `start` needs its own special case. Effort: Small.
  - **C.** Add a typed context-source policy beside the scope, derived from the shared event types. It gives each event type the source of its session and turn: the event root, the nested `start`, or no source. The reader then takes the IDs only from that source, and unknown types keep the root. The scopes stay `turn` and `workspace`. The Key code paragraph of `worker/chat/README.md` then also names the context source. Effort: Small.
  - Each option keeps the runner messages, the generated types, the browser, and the protocol docs as they are.
  - Each option keeps the type `tool.updated`, the saved-assembly fallback, the root IDs of turn events and unknown types, and the null IDs of workspace events.
  - The shared type of a part and the real runner carry no root IDs. Each option changes only the session and turn that a refusal marker names, and adds no rejection.
  - Each option extends the test at `worker/chat/tool-detail-stream.test.ts:75` with two refused later parts. The root IDs of one name another stored turn, and those of the other match nothing. Both markers must name the session and turn of the saved assembly.
- **Left out:**
  - Change nothing: the wrong or missing line breaks the chat rule above.
  - Refuse a part with root IDs: the part is already refused, so a rejection does not give its marker the right session. A new rejection also needs a user decision.
  - Correct the line in the browser: the browser does not know the saved assembly.
  - Change the runner: it already sends no root IDs, and the Worker still gets faulty or forged events.
  - Parse the part before the refusal: a parse failure has no parsed part, so the raw reader stays. B and C reach the same result with less code.
  - Prefer the saved assembly over `start` for every part: a valid `start` begins a new tool update. The saved assembly then belongs to the previous update.
  - Stop the root read for unknown types: a newer runner can send a turn event of an unknown type, with root IDs.
  - Test each event type with root IDs: that is a test for the class, which needs a user decision. C prevents the class by type.
- **Wider fix:** C. The shared types then state where each event carries its session and turn, so the reader cannot take a part's IDs from the root. A new event with its IDs in `start` also reads them there. B fixes only `tool.detail.part`.
- **Previous examples:** Commit `35bcbc2b1` of 18 November 2026 added the root read for a part without `start`, and the saved-assembly read on a null ID only. The branch that adds this item fixed the same class for workspace reports, such as `ports.updated`. Their shared types have no IDs, but their refusal markers used root IDs. Commits `277cd4488` and `27f888f4a` added `files.unavailable` and `ports.updated` to the reader, but not to the old list of workspace events in the refusal.
- **Recommendation:** C. It fixes the context source of a part at the same Small effort as B, and the typed policy then states each context source.
- **Action:** fix after merge, apply C, because the defect is rare and older than the branch that found it, and that branch fixed only workspace reports.

## Example

The IDs are placeholders. Session `session-a` runs turn `turn-a`. Session `session-b` has a stored turn `turn-b` in the same workspace.

1. The Worker accepts event 41 on stream `stream-1`. It is part 1, so the Worker saves the assembly with `session-a` and `turn-a`:

   ```json
   {"type":"tool.detail.part","start":{"sessionId":"session-a","turnId":"turn-a","tool":{"id":"tool-1","kind":"run","target":"npm test","detail":null,"omittedDetailBytes":0,"state":"running"}},"detail":"first piece","partNumber":1,"finalPart":false}
   ```

2. Event 42 skips part 2 and has the root IDs of session B:

   ```json
   {"type":"tool.detail.part","sessionId":"session-b","turnId":"turn-b","detail":"last piece","partNumber":3,"finalPart":true}
   ```

3. `parseToolDetailPart` accepts the shape and drops the root IDs. `filterToolDetail` refuses the part as `invalid`, because part 3 does not follow part 1.
4. `refuseRunnerEvent` gets the raw event. `readRunnerEventIdentity` finds no `start`, so it returns `session-b` and `turn-b`.
5. Both IDs are strings, so `refuseRunnerEvent` does not read the saved assembly, which holds `session-a` and `turn-a`. It clears that assembly.
6. `verifiedTurn` finds `turn-b` in `session-b`, so the Worker stores this marker:

   ```json
   {"type":"runner.event-refused","streamId":"stream-1","runnerEventNumber":42,"runnerEventType":"tool.updated","reason":"invalid","sessionId":"session-b","turnId":"turn-b"}
   ```

7. Session B shows "A tool update was lost because it could not be read". Session A shows no line for its lost update.
8. With `"turnId":"turn-x"`, which matches no stored turn, the marker has a null session and turn. Then no session shows the line.

## What the defect can reach

- It can put the lost line in another session of the same workspace.
- It can hide the lost line from the session that lost the update.
- It cannot name a session or a turn of another workspace or org. `verifiedTurn` reads only the sessions and turns of the current workspace object.
- It cannot show text of the private source, because a marker never copies the refused event.
- It cannot end a turn. Only a refused `turn.completed` or `turn.failed` ends one, and the marker type is `tool.updated`.
- It cannot start a report repair, because `refuseReportRepair` in `worker/chat/repair-refusal.ts` has no repair for `tool.updated`.
- It cannot keep the assembly open, because each refusal clears the tool source of its own stream.
- It does not change an accepted part.
- It gives the sender no new power. Code that can forge runner events can already send valid tool updates to each started turn of the workspace, through `prepareAgentEvent` in `worker/chat/turn-events.ts`. So the defect is a product bug, not a security problem.
