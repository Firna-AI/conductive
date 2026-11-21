# Wake a session when a watched turn ends

Status: Active. [PR #627](https://github.com/Firna-AI/conductive/pull/627) is open on branch `calummoore/wake-a-session-when-a-turn-ends-b5kh`. Cal requested the pull request before verification is complete on 21 November 2026. Watch decisions 2 D, 3 C, 4 C, 5 D, and 6 B remain approved. Milestones 1 to 5, 5a, and 5b are checked complete. The full implementation review found no new issue after the latest main integration. Runtime verification item 8 still needs Cal's answer. The pull request that completes this work deletes this plan.

Conductive agents hand work to other sessions. No workspace tool tells the caller when that work ends. A waiting parent keeps its turn and cloud computer active. This change adds a one-shot watch. The Worker wakes the calling session when the watched turn finishes, fails, or stops.

Cal chose option C in workspace 322 on 20 November 2026. His words were "1 = C - create that in a sub-workspace now, while we discuss 2". This plan records that choice as watch decision 1.

On 20 November 2026, Cal answered "2 = D", "3 = C", "4 = C", "5 = D", and "6 = B". These answers approve the contract below. No watch design decision remains open at the start of implementation.

## Coordination with services

Cal chose services, option B for brainstorm item 2, on 20 November 2026. [Workspace 475](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/msP0tcsEMU-tEeFyjeXKKSosVXVs0bWheJLDdoabwqo) builds that separate change. It adds commands in `crates/cnd-tools/` and guidance in the agent instructions. Keep watch commands and guidance in their own sections. The branch that merges second takes the latest `main` and resolves conflicts. This coordination changes no watch requirement.

The source is the [agent process management session](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/TECuGUpvCP2C5ezKfmG4f3VWeHSpToaeTHH8hDks8Og/sessions/iq1decCRv9wR4QbFyQpsCgAGmRKnXmCAk3GMzdo2bro). Research started at `c41f62825`. The branch then took `main` at `e54cbbd00` by fast-forward. Evidence belongs in `.context/watch-session/`. Review reports belong in `.context/reviews/calummoore/wake-a-session-when-a-turn-ends-b5kh/`.

## Scope and contract owners

The change includes the Worker call, durable watch delivery, the CLI, the MCP server, a chat line, its mockups, and protocol requirements. The new line uses the login and resume rules of late secret answers. Both Claude and Codex can use the call across their org.

The change keeps the background work rules, idle stop, turn limit, and dev server guidance. It adds no quota, rate limit, expiry, or stricter validation without Cal's answer. It changes no shared skill. It opens one pull request into `main` and does not merge it.

Contract owners:

- [Session calls](../docs/protocol/session-calls.md) and [Session management](../docs/protocol/session-management.md).
- [Agent tool access](../docs/protocol/agent-tool-access.md) and [Agent tools](../docs/protocol/agent-tools.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Message lines](../docs/protocol/message-lines.md).
- [Chat and events](../docs/protocol/chat-and-events.md).
- [Stop and resume](../docs/protocol/stop-and-resume.md).
- [Late secret answers](../docs/protocol/secret-late-answers.md).
- [Background work](../docs/protocol/background-work.md), for the boundary that this change keeps.
- [Worker tools](../worker/tools/README.md), [chat](../worker/chat/README.md), and [Rust tools](../crates/cnd-tools/README.md).
- [Migrations](../migrations/README.md) and [mockups](../docs/mockups/README.md).

## Terms

- **Turn:** the agent's work from a message to its end event. A Claude turn includes its waits for background work.
- **Calling session:** the session whose active turn sets the watch.
- **Watched turn:** the exact stored turn whose end triggers the watch.
- **Watch:** a Worker record that asks for one wake when the watched turn ends.
- **Wake line:** an app line that joins or starts a turn in the calling session.

## Replaced ways

The private `PendingCommand` type moves from `worker/chat/types.ts` to
`worker/chat/pending-command.ts`. Its shape stays the same. Each consumer
imports the new owner directly. The combined watch and upstream additions
put the old owner at 304 lines, above the repository's 300-line limit.
Milestone 3 lists every consumer and removes the old export.

The branch-only `agent-instructions-lifetime.md` duplicated the lifetime
requirements that latest `main` now owns in `session-instructions.md`.
The merge keeps the complete identical block in the main owner. Its two
instruction links and architecture index move there. Milestone 6 records
the checked consumers and removal.

The private `WorkspaceChatResolvers` type moves from
`worker/chat/workspace-integration.ts` to its own type module. Combined
upstream and watch additions put the old owner at 303 lines. All four
consumers import the new owner directly. Its shape and emitted code stay.

## Design

### Existing boundaries

- A write needs the calling workspace token and an active calling turn. The Worker reads its sender from stored turn data.
- Each call reaches only the org of the calling workspace. The usual workspace, session, membership, and archive checks apply.
- Late secret answers already admit a system line into an existing session. They never create a linked replacement session.
- A new wake turn acts for the sender who set the watch. A line that joins a running turn keeps that turn's sender.
- Delivery rechecks current membership, suspension, and login access. A line that can start no turn sends nothing.
- An accepted wake resumes a stopped computer under the same checks as an accepted late secret answer.
- Queued, running, and stopping turns count as active work in the session tools. A watch resolves one exact turn, not later work.
- Turn records retain their terminal state in workspace Durable Object storage. An active session pointer can advance to another turn.

### API and registration

The call uses `watch_session` and `conductive sessions watch`. The route is `POST /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/watch`. An omitted workspace names the calling workspace. The caller session and sender come from the stored calling turn, never from request fields. The call adds no watch flag to existing send or create bodies.

Watch decision 2 D accepts an optional exact turn ID. Omission resolves current active work in the target's chat queue. No active work returns an idle result and creates no watch. An explicit retained terminal turn returns its end state without a new record or wake. The caller reads it at once.

The reply names the target workspace, target session link, exact turn ID when one exists, and whether the watch was recorded. Exact targeting also needs an additive initial turn ID in the `create_workspace` reply. The stored workspace admission already has that ID. Rust owns each new boundary type. The generated TypeScript types are committed.

Watch decision 3 C refuses the exact active calling turn with HTTP 400 `invalid_input`. Watch decision 4 C merges repeated intent for the same calling session, member, target turn, and valid Stop generation. Watch decision 5 D drops older pending wakes at the caller after an explicit Stop. A fresh registration after cancellation creates new intent.

### Durable storage and delivery

Store watches beside the watched turn in the target workspace Durable Object. Use additive keys and records that older code can ignore. No D1 migration is planned. Missing new keys mean no watches. Do not rewrite existing turn or session records into an incompatible form.

Registration and turn completion use the same serialized chat queue. A pending watch always holds the resolved exact turn ID. A terminal transition marks matching watches ready in the same durable transaction. Retain enough terminal data to reconcile a watch after a restart or an older Worker completes its turn.

Use a persistent delivery queue. The workspace alarm retries ready watches outside the target's chat queue. Keep reconciliation scheduled while pending watches remain. Do not depend on the existing in-memory turn-end report list. Do not hold either workspace's chat queue across a call to the other workspace. Same-workspace delivery follows the same rule.

The calling workspace accepts a wake with a stable watch-derived message ID. It saves the line, message-to-turn link, runner command, and chat event together. A lost reply can retry without a second line or turn. A transient Worker error keeps the delivery pending. A permanent inability to start a turn consumes the watch without sending a line.

Watch decision 5 D checks a caller-owned Stop generation before acceptance. A fresh watch after Stop has a new generation. Repeated calls coalesce only within the same valid generation under watch decision 4 C. Automatic idle stops keep watches valid.

After durable acceptance, flush the runner or queue the normal resume. Keep resume retry state separate from line acceptance, so a failed start does not duplicate the line. Recheck whether the accepted wake still has live work before a later resume retry. A pending watch alone holds no active turn and extends no computer deadline.

Read the final state after login-failure normalization. Cover every terminal path through `TurnCompletion`, including queued stops, waiting-turn cancellation, login failure, attachment failure, repository refusal, runner failure, shutdown, and ordinary completion. A duplicate end event sends no duplicate wake. A finished turn can start a continuation for unanswered messages. Watch the original turn's end rather than following those message mappings. A computer stop alone is not a queued turn's end.

### Chat, agent text, and compatibility

Use one shared text function for the app line and the agent input. The wake names the watched session and its end. Watch decision 6 B adds a short app-written end reason when one exists. The session chip also names the workspace. The agent reads the result with `read_session`. The wake carries no raw error, result excerpt, or secret value.

Use the existing system-line appearance and session-link behavior. Add mobile and desktop mockups before UI implementation. Keep the live chat, loaded history, copy, and `read_session` consistent. Render each wake once and in stored event order.

Keep older runner commands compatible. A wake reaches the agent as ordinary text through the existing turn/message command. Add event fields or types without changing existing payload meanings. Check older client handling before choosing the event shape. Older software exposes the call only after its normal update.

The normal runner message prefix stays. Its sender line names the stored message sender. For a new wake turn, that member set the watch. For a wake that joins a running turn, the full late-secret admission rule selects that turn's sender. The shared wake text is the message body after that prefix.

The chat shows the app line and no member bubble or sender prefix. The message-lines protocol documents this application of its general sender-line rule. The separate late-secret wording mismatch remains in its follow-up.

### Authorization and earlier decisions

This change differs from decision 258's waiting read. Registration returns at once. The calling turn can end, and its computer can stop. The Worker watches its own turn records.

This change also differs from decision 258's required result reply. No child agent must send a report. The Worker reports failures and Stop as well as success. An ordinary tool message creates no watch by itself.

A turn end does not promise that a whole delegated task is complete. A child orchestrator can end its turn while its own watches wait. Unanswered messages can also move to a continuation turn. The wake describes the named turn's end. It never reports that a session or a task has settled. The agent reads the session and decides its next action.

Background work decision 1 rejected sandbox work that starts later turns by itself. A watch is explicit authorization during an active turn. Its sender comes from Worker records. Only the named turn's terminal transition can use it, once. Later sandbox code cannot add, change, or fire it with an expired turn token. The new turn uses current login checks.

Sandbox code with an active turn can already spend that sender's rights through `send_message`. A watch extends that existing delegation boundary to one later terminal event. It gives ambient processes no reusable right to start turns. It adds no general scheduler and changes no background work rule.

## Recorded design calls

The first three calls came from the brainstorm on 18 November 2026. They are agent calls, not user decisions.

- **18 November 2026, brainstorm agent call:** Fire each watch once at the end of its watched turn. Reason: the parent can set a new watch.
- **18 November 2026, brainstorm agent call:** A session with no running turn records no watch and returns that fact. Reason: the caller can read it immediately. Watch decision 2 can add a distinct exact-turn case.
- **18 November 2026, brainstorm agent call:** Send nothing when a wake can start no turn. Reason: late secret answers keep the same login rule.
- **20 November 2026, orchestrator call:** Recommend a separate watch call without send flags. Reason: exact-turn targeting can close the timing gap without changing three send bodies. Watch decision 2 H keeps atomic flags available for Cal.
- **20 November 2026, orchestrator call:** Store watches and pending delivery in the watched workspace's Durable Object. Reason: registration and the end can commit with the exact turn. Additive storage needs no D1 migration and preserves previous Worker reads and writes.
- **20 November 2026, orchestrator call:** Skip a closed calling session or an archived calling workspace when delivery cannot start a turn. Consume that watch. Reason: the chosen no-turn rule applies, and archived chat is read-only. Reopening later does not revive it.
- **20 November 2026, orchestrator call:** Add no list or cancel call unless Cal chooses watch decision 5 C or E. Reason: the one-shot call needs neither management API. The alternatives remain available for Cal.
- **20 November 2026, orchestrator call:** Tell agents to set a watch, then end their reply when only the watched work remains. Reason: option C already chooses this flow. Describe idle replies and `read_session`. Change no dev server instruction.
- **20 November 2026, orchestrator call:** Give mockups, docs, non-UI code, and UI code separate sequential milestones. Reason: their contracts and generated output overlap. Use the action named by each milestone.
- **20 November 2026, orchestrator call:** Keep the exact watched turn as the completion unit. Reason: Cal's task explicitly asks for the end of one turn. Following a message or waiting for a whole session changes that scope. The options check proposed those broader units. They remain recorded under watch decision 2's left-out approaches.
- **20 November 2026, orchestrator call:** Keep the no-line rule when delivery can start no turn. Reason: the task adopts that brainstorm call. UI research proposed a skipped-wake line, but it would add another display state without a requirement.
- **20 November 2026, orchestrator call:** Build one pure word module and reusable line component in the mockup milestone. Reason: both later Worker and UI milestones need that source. The UI milestone wires that component into the live transcript.
- **20 November 2026, orchestrator call:** Keep the normal sender prefix for wake input. Reason: the general message-lines rule requires it, and existing runners add it to ordinary messages. Its member follows the complete late-secret admission rule. This adds no exception for watch messages and changes no existing secret notice behavior.
- **20 November 2026, UI implementor call:** Use "A turn finished in", "A turn failed in", and "A turn stopped in" before the chip. Reason: the end stays visible when the chip wraps, and a session title can read as a command.
- **20 November 2026, UI implementor call:** Use the watched turn's `TurnEndReason` with the existing app words. Reason: this is the chat's end-reason contract. Raw failures and who stopped a turn stay in the watched session.
- **20 November 2026, UI implementor call:** Use one bell icon for every end and reuse the stop line's CSS. Reason: this marks an incoming wake without suggesting an end of the caller's turn.
- **20 November 2026, UI implementor call:** Keep the pure words in `docs/mockups/src/components/chat/wakeCopy.ts`. Reason: the Worker and transcript already import neighboring word modules. Milestone 3 replaces its temporary mockup end union with a generated type.
- **20 November 2026, UI implementor call:** A wake starts a new turn part and never folds. Reason: messages during a turn and late secret answers use this boundary.
- **20 November 2026, UI implementor call:** Show a finished wake turn with folded work in the failed variant. Show running wake turns in the other variants. Reason: the mockups check that the wake stays visible after folding.
- **20 November 2026, UI implementor call:** Use the checks of Saved carts' branch in its fixture. Reason: that fixture has no pull request. Show it ready in the workspace list without adding an unrelated screen.
- **20 November 2026, orchestrator refinement:** After Milestone 3, run Milestones 4 and 5 in parallel. Reason: Milestone 3 settles their shared contracts. Chat TypeScript and CLI/MCP Rust have separate owners, files, test fixtures, ports, and build output. This narrows the earlier call for sequential work. The combined gate still waits for both.
- **20 November 2026, orchestrator call:** Keep delivery paused under the existing org receiver fence. Retry retained watches after the lift with current access checks. Reason: no wake admission runs while the org is fenced. Discarding retained watches would add a cancellation rule that Cal did not choose.
- **20 November 2026, orchestrator call:** Add the watch to the public tool lists and sender and resume descriptions. Reason: Cal required legal and guide text that restates changed facts to stay aligned. This corrects the first audit's narrower reading of the open lists. The Terms digest changes with the approved feature text. This pull request makes no deployment.
- **20 November 2026, non-UI implementor call:** Keep additive indexes for live target watches and pending caller resumes. Retain authoritative settled records and receipts. Reason: watches have no expiry, but ordinary delivery must not scan all settled history.
- **20 November 2026, orchestrator call:** Tag private pending wake commands and remove them in the explicit Stop transaction. Keep their recorded history and ordinary member-message continuation. Reason: a raw finished end after Stop must not carry an earlier pending wake into a new turn.
- **20 November 2026, non-UI implementor call:** Prime recovery inside the target queue before delivery releases its snapshot. Later scheduling keeps an earlier alarm. Reason: an old held delivery must not postpone a new committed end, and retry backoff must remain.
- **20 November 2026, orchestrator call:** Use native stored target fixtures for core watch cases and real target admission for route and two-workspace smoke cases. Reason: each test needs the lowest boundary that protects its requirement. Keep all assertions and guards.
- **20 November 2026, orchestrator call:** Complete the normal startup path and runner-ready success phase in the resume smoke. Scope only preconditions to setup. Reason: manually marking startup prepared skips the dispatch fence that the wake must use.
- **20 November 2026, orchestrator call:** Move the private pending-command type and its direct consumers to a separate module. Reason: combined upstream and watch additions exceed the existing file cap. Preserve the type instead of compressing the old file or keeping a re-export.

- **20 November 2026, non-UI implementor call:** Keep exact-turn parsing in its own watch input module and reuse the common adapters. Reason: existing routes, authentication, and errors stay shared.
- **20 November 2026, non-UI implementor call:** Keep new watch help and runner guidance in distinct sections. Reason: the services branch owns its separate additions.
- **20 November 2026, non-UI implementor call:** Reuse existing old workspace-create reply cases and check the additive turn ID in the real interface smoke. Reason: a duplicate regression test adds no protection.
- **20 November 2026, non-UI implementor call:** Use private deterministic HTTP controls for actual CLI and MCP smoke. Reason: M3 already proves real Worker targeting, delivery, and resume.

- **20 November 2026, UI implementor call:** Keep the generated notice in each wake item and derive its identity from the watch. Reason: one watch fires once.
- **20 November 2026, UI implementor call:** Follow the hidden message to its actual turn without a notice-turn fallback. Reason: a continuation can take that message.
- **20 November 2026, UI implementor call:** Treat an untaken wake message as waiting. Reason: running-turn items must stay before waiting input.
- **20 November 2026, UI implementor call:** Put answers after their wake line. Reason: each answer stays with the messages that it answers.
- **20 November 2026, UI implementor call:** Copy the notice's canonical link inside angle brackets. Reason: agent and copied text use the same complete link.
- **20 November 2026, UI implementor call:** Put copied wake text under its turn's agent heading. Reason: the app line has no member heading.
- **20 November 2026, UI implementor call:** Read unknown optional reasons as absent and unknown terminal states as unreadable. Reason: this follows the existing event-reader contract.
- **20 November 2026, UI implementor call:** Mount UI cases with the real links context. Reason: a static render cannot show the real session chip.
- **20 November 2026, UI implementor call:** Share five recorded wake chats between tests and dev views. Reason: production flows keep real data and the registry stays below its file cap.
- **20 November 2026, orchestrator integration call:** Keep main's session-instruction lifetime owner and remove this branch's duplicate page. Reason: the full requirement blocks are identical.
- **20 November 2026, orchestrator integration refinement:** Keep ordinary sender-line placement for each installed runner. Reason: main's skill work now places it after normal messages. This refines the earlier prefix wording without adding a watch exception.

- **20 November 2026, orchestrator correction:** Make the fixture-only message ID helper private. Reason: all callers share its module, and the full gate rejects its unused export. Its implementation stays unchanged.

- **20 November 2026, orchestrator integration call:** Use main's shared text-block builders for the two wake fixture sites. Reason: main replaced fixture strings, so the approved appearance needs its current data format.
- **20 November 2026, orchestrator integration call:** Move the private workspace chat resolver type and four direct imports into a separate owner. Reason: combined upstream and watch additions exceed the existing file cap. Keep its shape and emitted code.

The fresh options check is `.context/watch-session/options-check.md`. Its resolution is `.context/watch-session/options-check-resolution.md`. The check widened the options and changed the recommendations for repeat calls and Stop. The orchestrator kept the task's one-turn scope when it chose the targeting recommendation.

## Decisions

Each decision assumes option C's one-shot, active-turn, org-reach, sender, login, and resume rules. These assumptions come from Cal's task and the chosen approach. Each open option keeps them unless its text says otherwise.

### Watch decision 1: Wake after delegated work ends

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `docs/protocol/session-calls.md`, `worker/tools/`, and `crates/cnd-tools/`.
- **Background:** Agents start work in other sessions. Parents currently wait with timers and polls.
- **Problem:** Waiting keeps the parent turn and computer active. A failed or stopped child sends no result itself.
- **Impact if no action:** Delegation spends computer time and model requests only to check for completion.
- **Root question:** How does an agent learn that delegated work ended while its own turn and computer can stop?
- **Options:**
  - **A.** Ask children to report with `send_message`, then end the parent reply. Failure or Stop can lose the report. Effort: Small.
  - **B.** Add a scheduled self-message. Each check still guesses the end time and can start the parent computer. Effort: Large.
  - **C.** Add an explicit watch. The Worker wakes the caller at the real end, including failure and Stop. Effort: Large.
- **Left out:** A waiting call keeps the parent active. Automatic watches of all messages can loop agents. A paused agent process cannot survive a computer stop. No change fails the goal.
- **Wider fix:** C. The end event replaces timers and polls.
- **Previous examples:** Decision 258 rejected waiting reads and mandatory child replies. Secrets decision 10 B supplies the sender and login precedent. Decision 260 supplies resume behavior. Background work decision 1 did not choose scheduled self-messages or CI completion messages.
- **Recommendation:** C. It wakes the parent at the real end and lets its computer stop meanwhile.
- **Action:** Apply C. Cal chose C on 20 November 2026 with "1 = C - create that in a sub-workspace now".

### Watch decision 2: Identify the intended work

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/tools/session-routes.ts` and `docs/protocol/session-calls.md`.
- **Background:** `send_message` and `create_session` return a turn ID. `create_workspace` currently returns neither a turn nor a message ID. Its stored admission has both. A session can end one turn and start another before registration.
- **Problem:** A current-session watch can find no active turn or watch later work instead. The brief leaves the target choice open.
- **Impact if no action:** The API can miss or misidentify the work that the caller intended to watch.
- **Root question:** How should an agent watch the intended turn without a registration timing gap?
- **Options:**
  - **A.** Take a session only and watch its current active turn. An idle reply tells the caller to read it. A fast finish can win the registration race. Effort: Medium.
  - **B.** Require the session and exact turn ID. An already ended turn wakes immediately. Add the initial turn ID to `create_workspace` replies. Other callers need a way to find a turn ID. Effort: Large.
  - **C.** Take the session and an optional turn ID. With an ID, watch that turn or wake immediately if it ended. Without one, use A. Add the initial turn ID to `create_workspace` replies. Effort: Large.
  - **D.** As C, but an already ended exact turn returns its end state. Record no watch and send no line. The caller reads it at once. Effort: Medium.
  - **H.** Add watch flags to send and both create calls. Register the accepted turn's watch atomically with its message. Keep the separate watch call for other current turns. This changes three existing write bodies. Effort: Large.
- **Left out:** E follows a message into later continuation turns. F waits for a future turn. G waits until a session has no active turns or pending watches. These change the requested completion unit from one current or named turn. A blocking call keeps the parent active. The options check assigned these letters, which stay reserved.
- **Wider fix:** D. Stable turn identity removes the registration race. A terminal reply avoids a redundant wake while the caller is already active.
- **Previous examples:** Send and session-create replies expose `turnId`. Workspace admission retains its initial turn ID but omits it from the tool reply. Stored turn records retain their terminal state.
- **Related:** Watch decision 4 chooses the identity used to merge repeated registrations.
- **Recommendation:** D. The first draft recommended C. The check preferred G for whole-task completion. D keeps the one-turn scope that Cal requested.
- **Action:** Apply D. Cal chose D on 20 November 2026 with "2 = D".

### Watch decision 3: Handle the caller's own turn

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/tools/session-routes.ts` and `docs/protocol/session-calls.md`.
- **Background:** A session knows its own turn ID. A watch of that turn would wake the same session after its reply. It can also wake after Stop if watch decision 5 keeps the watch.
- **Problem:** Self-watching can restart the work that a member just stopped. Refusing it adds a new boundary rule.
- **Impact if no action:** An unspecified case can create repeated wakes or inconsistent tool replies.
- **Root question:** What should happen when a session watches its own active turn?
- **Options:**
  - **A.** Allow it under the same one-shot rules. With watch decision 5 A, self-watches can restart after every Stop. That changes decision 262's promise that Stop ends a loop. Effort: Small.
  - **B.** Return a successful reply that says no watch was set. It avoids a new error but needs an extra result state. Effort: Small.
  - **C.** Refuse only a watch of the exact active calling turn with HTTP 400 `invalid_input`. Other turns keep their normal rules. Effort: Small.
  - **D.** Allow self-watches, but send no wake when that watched turn ends as stopped. Deliberate self-wakes after other ends still work. Effort: Small.
- **Left out:** Refusing every session in the caller's workspace blocks useful delegation. Refusing earlier turns of the same session adds an unnecessary restriction.
- **Wider fix:** C. It makes a self-wake an explicit unsupported operation at registration.
- **Previous examples:** `stop_session` allows self-stop. The session tools set no automatic loop limit under decision 262.
- **Related:** Watch decision 5 sets Stop's effect on pending wakes. Its D also stops self-watches from undoing Stop.
- **Recommendation:** C. The requested flow watches other work. A clear refusal exposes a mistaken target.
- **Action:** Apply C. Cal approved the exact-calling-turn refusal on 20 November 2026 with "3 = C".

### Watch decision 4: Repeat a watch request

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/tools/session-routes.ts` and `docs/protocol/session-calls.md`.
- **Background:** A lost reply can cause a retry. Several valid watch calls can also name the same exact turn.
- **Problem:** One-shot delivery for each record does not say whether those calls create one record or several.
- **Impact if no action:** Retries or duplicate intent can cause extra wake lines and extra model requests.
- **Root question:** When should repeated calls produce another wake?
- **Options:**
  - **A.** Treat every call as a new watch. Even a retry can create another wake. Effort: Small.
  - **B.** Take a request ID, as send does. The same ID and inputs replay the result. Conflicting reuse gets HTTP 409 `watch_conflict`. A new ID creates another watch and wake. Effort: Medium.
  - **C.** Coalesce repeats for the same calling session, sender, target turn, and valid Stop generation. Return the same watch. A fresh registration after cancellation creates new intent. A terminal exact-turn reply follows watch decision 2. Effort: Medium.
- **Left out:** A time-based duplicate window guesses intent and adds an expiry rule. A per-session limit adds a restriction outside the chosen scope.
- **Wider fix:** C. The watch's own identity merges retries even when the tool generates a new request ID.
- **Previous examples:** `send_message` and `create_session` use optional request IDs and replay accepted writes.
- **Related:** Watch decision 2 defines the target. Watch decision 5 defines when a cancelled watch needs new intent.
- **Recommendation:** C. The first draft recommended B. The check showed that another agent tool call generates a fresh ID unless the agent supplies the earlier one.
- **Action:** Apply C. Cal chose C on 20 November 2026 with "4 = C".

### Watch decision 5: Stop the caller before delivery

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/turn-lifecycle.ts` and `docs/protocol/session-calls.md`.
- **Background:** Stop ends the caller's current turn and leaves its session open. A late secret answer can later start another turn there. A member can also stop the whole cloud computer.
- **Problem:** An earlier watch can also wake that stopped session. The brief does not say whether Stop cancels that pending request.
- **Impact if no action:** A member can see an agent start again after Stop, without a stated rule for that behavior.
- **Root question:** What should an explicit Stop do to pending wakes for the sessions that it stops?
- **Options:**
  - **A.** Keep pending watches after a session Stop or an explicit computer Stop. A later watched end can start another turn, as a late secret answer does. Effort: Small.
  - **B.** Cancel pending watches for the calling session on an explicit session Stop. Cancel the workspace's outgoing watches on an explicit computer Stop. Keep watches across automatic idle stops. This needs durable cancellation across target workspaces. Effort: Medium.
  - **C.** Keep watches on Stop and add explicit list and cancel calls. A caller can inspect and cancel them separately. This adds management APIs beyond one watch call. Effort: Large.
  - **D.** Mark an explicit Stop in the calling session or workspace. Drop older pending wakes at that caller's acceptance step without sending a line. Keep watches across automatic idle stops. This needs no cancellation call to each target workspace. Effort: Medium.
  - **E.** Show pending watches in chat with Cancel, including while the caller has no active turn. Pair this with A or D for Stop. This needs a new app flow and mockups. Effort: Large.
- **Left out:** Cancelling watches at every normal turn end fails the goal. The parent must be able to end its reply and keep its watch.
- **Wider fix:** D. Each wake passes the caller's acceptance point, so no target can miss the Stop.
- **Previous examples:** Late secret answers start a turn in an open session. Close and Archive prevent new delivery under existing access rules.
- **Related:** Watch decision 3 covers self-watches. Watch decision 4's repeated-watch identity must allow a fresh registration after Stop.
- **Recommendation:** D. The first draft recommended A. The check showed that a late Allow is new member input, while a watched end needs no new member action.
- **Action:** Apply D. Cal chose D on 20 November 2026 with "5 = D".

### Watch decision 6: Choose the wake line's facts

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `src/shared/`, `src/chat/`, and `docs/mockups/`.
- **Background:** The wake must name the watched session and its end. The agent gets the same words as the app and then reads the result.
- **Problem:** The brief leaves the workspace and end reason open. Raw failure details can make a routine line long.
- **Impact if no action:** The mockup and implementation can choose different facts or wording.
- **Root question:** What should the wake tell the reader before they read the watched session?
- **Options:**
  - **A.** Show the session chip and finished, failed, or stopped. The chip already names the workspace. Read the session for all other details. Effort: Small.
  - **B.** As A, plus a short app-written end reason when one exists. Keep raw errors in the watched session. Effort: Small.
  - **C.** Show the workspace, session, state, and the stored failure message or end reason. This gives detail sooner but can make the line long. Effort: Medium.
  - **D.** As B, plus a bounded excerpt of the watched turn's last answer. It can avoid a read, but copies result text into the caller's history. Effort: Medium.
- **Left out:** A line with no session link fails the chosen flow. The options check restored the result excerpt as D because it has a real trade-off.
- **Wider fix:** None. One shared text builder already prevents chat and agent wording from drifting.
- **Previous examples:** Late secret answers use one shared builder. Tool messages and stop notices already show session links.
- **Recommendation:** B. It gives context across workspaces and keeps detailed errors in their source session.
- **Action:** Apply B. Cal chose B on 20 November 2026 with "6 = B".

## Milestone 1: Wake line mockups — completed

Tags: mockup

Depends on: none

Use the `ui implementor` action. Cal answered watch decisions 2 to 6 on 20 November 2026, so this milestone can start. The orchestrator checks each result before ticking its TODO.

- [x] Add desktop and mobile wake-line mockups within the existing workspace chat catalogue. Show finished, failed, and stopped outcomes, including another workspace.
- [x] Reuse `@firna/ui`, existing app system lines, and session chips. Keep screen-spec pages within five rendered screens.
- [x] Create the single pure wake word module and reusable line component for later Worker and app consumers. Add pending-watch controls only if Cal chooses watch decision 5 E.
- [x] Run `npm run mockups:check`. Open the changed pages in the cloud computer browser. Save PNG screenshots in `.context/watch-session/`.
- [x] Update the design and TODOs of this plan for each problem that the mockups show.

Evidence: `.context/watch-session/m1-report.md` and `.context/watch-session/m1-root-check.md`.

## Milestone 2: Documentation and protocol — completed

Depends on: 1

Use the `docs implementor` action for internal docs. Use the `external docs implementor` only if a public guide needs changed words.

- [x] Add a short watch protocol section or linked page. State targeting, one-shot ends, repeat rules, access, skipped delivery, text, and resume behavior.
- [x] Update session calls, agent tool access, agent tools, message lines, chat and events, stop and resume, and agent instructions where their current claims need the watch.
- [x] Read both legal pages and every public guide in full. Update each sentence that restates a changed fact. Keep unrelated guide work outside this change.
- [x] Update the relevant tools, chat, runner-interface, and Rust tools READMEs with public behavior and useful entry points. Check every changed Markdown link.

Evidence: `.context/watch-session/m2-report.md`, `.context/watch-session/m2-root-check.md`, and `.context/watch-session/m2-public-report.md`.

## Milestone 3: Durable watches and shared contracts — completed

Depends on: 2

Use the `non-ui implementor` action. Keep generated shared types and their generator in one writer's scope.

Integration evidence: `.context/watch-session/m3-main-merge.md` records preserved main changes and the three mockup documentation conflict resolutions.

Latest integration evidence: `.context/watch-session/m3-integration-main.md` records the merge of `359f05203`, its 196 preserved upstream paths, and the restored M3 tree.

- [x] Define the new request, reply, and chat boundary types in `crates/cnd-runner-interface/`. Regenerate `src/shared/generated/` with the repository command.
- [x] Replace the mockup's local `WakeEnd` union with the generated terminal type. Build agent input with the single `wakeText` and `wakeWords` source.
- [x] Add the fixed Worker route with existing active-turn, stored sender, membership, org, and archive rules. Implement the approved target and repeat semantics.
- [x] Expose the initial accepted turn ID in workspace-create replies. Keep the field additive for older tools and the previous Worker.
- [x] Implement the approved caller Stop rule. Capture caller-owned Stop generations and check them at acceptance. Keep idle-stop watches valid and allow fresh watch intent after an explicit Stop.
- [x] Add additive watch records, exact-turn registration, and durable pending delivery to target workspace storage. Prove previous Worker storage compatibility once.
- [x] Integrate every terminal path with the persistent delivery queue. Reconcile retained terminal turns after restart. Retry transient failures without holding cross-workspace chat queues.
- [x] Admit wake lines with stable message IDs. Reuse late-secret login rules, current turn selection, runner dispatch, and stopped-computer resume. Consume undeliverable watches.
- [x] Update the Worker tools, chat, and runner-interface entry points. Remove the temporary README statement that the watch route is not accepted yet.
- [x] Move the private pending-command type to its own module and remove its old export without changing its shape.
  - [x] Move the import in `worker/chat/attachment-delivery.ts`.
  - [x] Move the import in `worker/chat/runner-delivery.ts`.
  - [x] Move the import in `worker/chat/runner-login-failure.ts`.
  - [x] Move the import in `worker/chat/attachment-legacy-path.test.ts`.
  - [x] Move the import in `worker/chat/turn-lifecycle.ts`.
  - [x] Move the import in `worker/chat/store.ts`.
  - [x] Move the import in `worker/chat/runner-command-preparation.ts`.
  - [x] Move the import in `worker/chat/chat-records.ts`.
  - [x] Move the import in `worker/chat/ordered-dispatch.ts`.
  - [x] Move the import in `worker/chat/delivery-state.ts`.
- [x] Add focused route and lifecycle regression cases for registration races, terminal outcomes, duplicate delivery, restart recovery, login access, and closed or archived callers. Reuse existing tests when they cover the requirement.
- [x] Prove each new test fails on a behavior assertion. Run each new asynchronous test ten times. Save evidence and test costs under `.context/watch-session/`.

Evidence: `.context/watch-session/m3-report.md`, `.context/watch-session/m3-root-check.md`, `.context/watch-session/m3-root-repeat-check.json`, `.context/watch-session/m3-length-fix.md`, and `.context/watch-session/m3-combined-check.md`.

## Milestone 4: Chat line implementation — completed

Tags: ui

Depends on: 3

Use the `ui implementor` action. The approved mockup and generated event type are available before this milestone starts.

- [x] Render the approved `WakeLine` with real `SessionLinkText`, terminal data, and the shared word module from Milestone 1.
- [x] Keep live events, stored history, copy, and agent transcript text aligned. Preserve event order and once-only display.
- [x] Run focused existing chat and transcript tests for the new behavior. Add a test only for an uncovered requirement. Record new asynchronous test proofs and ten-run counts.
- [x] Check the app in the cloud computer browser at desktop and mobile widths. Compare it with the mockup. Save PNG screenshots under `.context/watch-session/`.

Evidence: `.context/watch-session/m4-report.md`, `.context/watch-session/m4-root-check.md`, and `.context/watch-session/m4-root-proof-check.json`.

## Milestone 5: CLI, MCP, and agent guidance — completed

Depends on: 3

Use the `non-ui implementor` action. The live watch path and generated contracts exist first. This work can run beside Milestone 4. Keep each agent's files, ports, test fixtures, and build output separate. The final pull request includes both milestones.

- [x] Add `watch_session` to the MCP schema and dispatch. Add `conductive sessions watch` to CLI parsing and help.
- [x] Update `crates/cnd-tools/README.md`, `crates/cnd-cli/README.md`, `tools/README.md`, and `tools/calls.md`. Replace the old call counts and the temporary unbuilt-call statement.
- [x] Expose the approved targeting and coalescing rules consistently. Return the Worker reply and its existing error form.
- [x] Add watch guidance to tool descriptions and `crates/cnd-runner/src/engine/instructions.rs`. Tell agents to set the watch, end their reply, and read the session after a wake.
- [x] Explain that a turn end does not mean a whole delegated task ended. Explain the approved Stop rule. Change no shared skill in this repository.
- [x] Keep existing session instructions stable for their lifetime. Keep all dev server guidance unchanged.
- [x] Run focused Rust CLI/MCP tests and smoke-test the call through both interfaces. Check old calls still use their original payloads.

Evidence: `.context/watch-session/m5-report.md`, `.context/watch-session/m5-root-check.md`, and `.context/watch-session/m5-root-proof-check.json`.

## Milestone 5a: Align wake fixtures with the shared renderer — completed

Tags: mockup

Depends on: 4, 5

Latest main replaced fixture strings with shared text-block trees. Use the `ui implementor` action for this integration gap. Keep the approved words and appearance.

- [x] Move the two agent-block sites in `wakeConversations.ts` to main's fixture builders. Preserve inline code and session links.
- [x] Run the mockup check and inspect the wake states at desktop and mobile widths. Save PNG evidence and stop the preview and browser.
- [x] Check the delegated source and evidence before ticking these tasks. Record any design change that the check needs.

Evidence: `.context/watch-session/m5a-report.md` and `.context/watch-session/m5a-root-check.md`.

## Milestone 5b: Keep wakes in registered mockup props — completed

Tags: mockup

Depends on: 5a

Main now registers chat parts with JSON props. Its two transcript schemas must also admit the existing wake fixture. Use the `ui implementor` action. Keep the approved words and appearance.

- [x] Add the existing wake shape to both registered chat item schemas. Keep their other variants and constraints.
- [x] Check the combined mockup types and strict build. Preserve main's registered session-link wrapper in the wake line.

Evidence: `.context/watch-session/pr-schema-report.md` and `.context/watch-session/pr-static-job.log`.

## Milestone 6: Verification, review, and pull request

Depends on: 4, 5, 5a, 5b

The orchestrator owns this milestone. No delegated tests run beside the gate.

Evidence: `.context/watch-session/m3-combined-check.md`, `.context/watch-session/m45-integration-main.md`, `.context/watch-session/m45-all-links.txt`, and `.context/watch-session/final-public-audit.md`.

- [x] Integrate latest main and preserve each upstream path.
  - [x] Move both instruction links from the duplicate lifetime page to `session-instructions.md`.
  - [x] Remove the duplicate architecture-index entry and keep main's owner entry.
  - [x] Remove the branch-only duplicate lifetime page after full-block equivalence.
  - [x] Keep upstream sender guidance beside the distinct watch section.
  - [x] Align watch prose with the ordinary sender-line placement of each runner.

Evidence: `.context/watch-session/m45-integration-main.md` and its preservation records.

- [x] Inspect each delegated diff and report against the approved contract and repository rules. Tick only checked results.
- [x] Smoke-test a completed, failed, and stopped watched turn. Check a stopped caller computer resumes through the normal path. Use local deterministic controls when production access is unnecessary.
- [x] Run early format, lint, and file-length checks with Node 24. Install desktop and runner dependencies as `CLAUDE.md` requires.
- [x] Make the fixture-only wake message ID helper private for the unused-export check. Keep its implementation and callers.
- [x] Investigate the new stopped-caller runtime smoke failure in the full suite. Keep all assertions, normal startup phases, and guards.
- [ ] Apply Cal's choice for implementation item 8 in `follow-ups/watch-resume-test-timeout.md`. Keep the test and gate unchanged until that answer.
- [x] Integrate the next main tip after the active gate releases its tested tree. Preserve every upstream path and check both overlapping mockup files.
- [x] Move `WorkspaceChatResolvers` unchanged to its own type module for the existing file cap.
  - [x] Update `worker/chat/workspace-integration.ts`.
  - [x] Update `worker/workspace-lifecycle.ts`.
  - [x] Update `worker/workspace.ts`.
  - [x] Update `worker/lifecycle/native-alarm-workspace.test-support.ts`.
  - [x] Prove unchanged emitted code and run the combined type and lint checks.
- [ ] Run `npm run check` after Cal's choice for item 8. Report the interrupted run and its failures.
- [x] Run `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and `cargo test --workspace` on the current combined tree.
- [x] Regenerate shared bindings and verify no uncommitted drift. Run `cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli`.
- [x] Commit with Conventional Commits and push this branch after the preservation audits.
- [x] Record and apply the fix rule to the sent-but-unacknowledged wake continuation display finding. Preserve existing member-message placement.
- [x] Resolve the PR conflicts with main `68342ce4a`. Preserve each upstream path and inspect every combined owner.
- [x] Integrate main `558838e09` after it moved during the first PR merge. Keep its catalogue rows and the watch entry.
- [x] Review the complete diff against `origin/main` after the push with the `implementation-review` skill. Save the review and findings. Check new findings with the `second-pass review agent`. Fix `fix now` findings, record other findings as follow-up items, re-review once, and report.
- [ ] Check and review any source correction that Cal chooses for runtime item 8 before the final pull request.
- [ ] Delete this plan after every earlier TODO is ticked and review rounds are complete. Preserve a permalink and every dated decision in the pull request description.
- [ ] Open the pull request into `main`. Wait for green `Complete gate` and `Rust gate` checks on its last commit. Report its URL, commit, decisions, checks, and remaining follow-up items. Do not merge it.
