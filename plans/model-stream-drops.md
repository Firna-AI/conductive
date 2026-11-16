# Model answers that drop mid-stream

Status: Active. On branch `calummoore/delft-n4qf`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 16 November 2026 the user showed a Claude turn that ended with "This
turn stopped. API Error: Connection lost mid-response. The response above
may be incomplete." Claude writes that text when the stream of a model
answer closes after part of the answer arrived. Claude keeps the part and
does not send the request again. The runner then ends the turn as failed,
and the member must press Try again.

Each model request of an agent goes through the model gateway of the
Worker. While an answer streams, the gateway checks the turn token through
the Durable Object of the workspace every 15 seconds. The answer ends when
one check throws, or when no check returns within the 30-second lease. A
check throws when the object resets, for example after a deploy. A check
also waits in the chat queue of the object, behind lifecycle calls that
can take longer than the lease. Anthropic and the network can also end a
stream. Nothing shows which cause ended the answer of 16 November.

This change does two things. The gateway makes its checks more tolerant
(decision 1). The Claude adapter of the runner continues the session once
by itself after a drop, before it fails the turn (decision 2). The gateway
change applies to the answers of all agents. Codex turns get no continue
message.

Contract owners:

- [Model gateway: requests and answers](../docs/protocol/model-gateway-requests.md#streams).
- [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Chat and events: what the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows),
  when decision 3 adds a chat line.
- The [model gateway README](../worker/model-gateway/README.md).
- The [runner behavior guide](../runner/behavior.md) and the
  [SDK helper README](../runner/sdk-helper/README.md).

## Terms

- **Turn token:** a secret of one turn. Claude sends it to the gateway in
  place of the agent login.
- **Lease:** the time in which a streaming answer must pass a new turn
  token check. It is 30 seconds, by gateway decision 6.
- **Chat queue:** `ChatStore.run` in `worker/chat/store.ts`, the one serial
  queue of a workspace Durable Object. The turn token check runs in it.
- **Drop:** a model answer stream that ends before the answer is complete.
  Claude 2.1.325 then writes "… mid-response. The response above may be
  incomplete." or "… before a response was produced. Try again."
- **Continue message:** a user message that the Claude adapter sends by
  itself after a drop. The chat does not show it.

## Decisions

A stream drop decision number names a decision of this change. The
options check of 16 November 2026 added options to each decision. Its
report is in `.context/model-stream-drops/options-check-report.md`.

### 1. A turn token check ends a streaming answer

Changed: the options check found a second cause, the chat queue, and
added options D, E, and F. The answer A stays in force until the user
answers again.

- **Answer:** A, on 16 November 2026. Asked again for F.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `worker/model-gateway/request-lifetime.ts:138-170`,
  `worker/model-gateway/workspace.ts:93`.
- **Problem:** A periodic check that throws ends the answer at once. The
  gateway does not try again, although up to 15 seconds of the lease
  remain. A check that waits in the chat queue for longer than the lease
  also ends the answer. A lifecycle call can hold the queue for up to 30
  seconds, and a sandbox command for longer.
- **Root question:** How do we stop our own systems from ending a model
  answer that is still valid?
- **Options:**
  - **A.** Retry a check that throws, with a new Durable Object handle,
    until the lease ends. Effort: Small.
  - **B.** Do A. Also send Claude streams through a path that a deploy
    does not cut, such as the egress container. Effort: Large.
  - **C.** Change nothing. Rely on the recovery of decision 2. Effort:
    Small.
  - **D.** Use the retry of the Cloudflare runtime for calls to a Durable
    Object, in place of a loop in the gateway. It does not retry an error
    that the check code throws, and local tests cannot show it. Effort:
    Small.
  - **E.** Do A. Also write a Worker warning for each check that throws,
    each retry, and each answer that the gateway ends. The warning holds
    the workspace ID and the error kind only. Effort: Small.
  - **F.** Do E. Also let the periodic check read the turn outside the
    chat queue. The check enters the queue only when it must write. A read
    outside the queue must never see a half-written turn, because a false
    refusal ends a valid answer. Effort: Medium.
- **Left out:** Removing the periodic check or a longer lease breaks
  gateway decision 6. Fewer deploys only reduce how often a reset happens.
  A copy of the turn state in D1 for the check: F is better on every
  point.
- **Wider fix:** F. It covers a check that throws and a check that waits
  behind other work.
- **Previous examples:** The start progress phases make their calls
  outside the chat queue since 11 November 2026.
  `plans/follow-ups/lifecycle-calls-hold-chat-queue.md` holds the rest.
- **Recommendation:** F. Only F removes the wait in the queue, which A
  does not touch. E is the smallest safe step, and I apply its warning
  under the answer A in any case.
- **Action:** Ask the user, because F changes the recorded answer A and
  adds Medium effort with a risk of false refusals.

### 2. A dropped answer needs a manual restart

- **Answer:** C, on 16 November 2026.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `runner/sdk-helper/src/providers/claude-outcome.ts:43-63`.
- **Problem:** Decision 1 cannot prevent every drop. The member must
  notice the failure and press Try again. The agent then gets the full
  request again.
- **Root question:** How should a turn continue after its model answer
  drops?
- **Options:**
  - **A.** Change nothing. Members use Try again. Effort: Small.
  - **B.** Give the drop its own failure code and a Continue action in
    place of Try again. Effort: Medium.
  - **C.** The runner continues the session once by itself after such a
    drop, then fails as now if it drops again. Effort: Medium.
  - **D.** Do C, and find the drop from the stream events too: an answer
    that started and never stopped. Added by the options check. Effort:
    Medium.
- **Left out:** A retry inside Claude: I found no setting of Claude
  2.1.325 that sends a request again after part of the answer arrived. An
  automatic Try again by the workspace: C keeps the turn and the cut part,
  and needs the same detection. A replay by the gateway breaks the rule
  that the gateway never replays a model upload.
- **Reason for the answer:** C recovers from every source of drops without
  the member. I apply the detection of D under the answer C, as a design
  call, because it does not depend on the words of one Claude version.

### 3. The chat does not say that the agent continued

Changed: the options check added options C, D, and E, and moved the
location. The recommendation changed from A to C.

- **Answer:** Open.
- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `docs/protocol/chat-and-events.md`, "What the chat shows".
- **Background:** With decision 2, the chat shows the part of the answer
  that arrived. The turn stays Working. The answer to the continue
  message then follows as a new answer in the same turn.
- **Problem:** The first answer can end in the middle of a sentence. No
  line tells the member why. The member also does not see that the agent
  sent one more model request.
- **Impact if no action:** A member can read the cut answer as an error
  of the agent.
- **Root question:** What does the member see when the agent continues
  after a drop?
- **Options:**
  - **A.** No chat line. Effort: Small.
  - **B.** A line in the turn from a new runner event. It needs Worker
    storage, the chat part, and a mockup. Effort: Medium.
  - **C.** The continue message asks the agent to start its reply with
    one short sentence that says that the connection dropped. The words
    come from the agent, so they can vary. Effort: Small.
  - **D.** An optional field on `assistant.completed` marks the cut
    answer. The chat shows a line under the cut text, such as "The
    connection to the model dropped. The agent continued." It needs no new
    event, but it changes the Rust type, the Worker, the app, and a
    mockup. Effort: Medium.
  - **E.** A note at the end of the turn, like "Standard speed", from an
    optional field on `turn.completed`. It shows far from the cut. Effort:
    Medium.
- **Left out:** A line only in the session Markdown export fails the goal,
  because the member reads the chat. A toast fails when no tab is open. A
  join of the next answer to the cut answer fails when the agent does not
  resume at the exact word. Hiding the cut part loses the start of the
  answer.
- **Wider fix:** None, because the item is about one text.
- **Previous examples:** None found.
- **Recommendation:** C, first A. C makes sure that the next answer says
  that the agent continued, at a Small cost. D gives the product's own
  words at the cut, and a later change can add it.
- **Action:** Ask the user, because the options have real trade-offs:
  agent words cost little, and product words need a new field and a
  mockup.

## Design

Each item below is my call, on 16 November 2026, unless it names a
decision.

- The gateway retries only the periodic checks, not the first check.
  Reason: the first check runs before any answer byte. Its HTTP 503
  `model_gateway_unavailable` makes Claude send the request again by
  itself.
- A check that throws is tried again after 1, 2, then 4 seconds, until
  the lease ends. An error that Cloudflare marks as `overloaded` gets no
  retry. A check that answers with a refusal still ends the answer at
  once. Reason: Cloudflare advises backoff and no retry of an overloaded
  object. A refusal means that the turn ended, and gateway decision 6
  then applies.
- Each check gets a new Durable Object handle from the gateway runtime.
  Codex checks in `codex-request-auth.ts` do the same. Reason: Cloudflare
  says that a handle can stay broken after an error.
- The gateway writes the warning of option E of decision 1 with
  `warnWorker`. Reason: without it, nobody can see whether cuts continue.
  The open item `plans/follow-ups/request-records-in-logs.md` already
  covers the words of the Privacy page about Worker logs.
- The Claude adapter finds a drop from either signal: Claude's drop text,
  or a failed result after a main answer that started and never stopped.
  Reason: decision 2, option D.
- Each agent process gets one continue message at most. A second drop
  fails the turn as today. Reason: decision 2 says once, then fail.
- The continue message answers the same member messages as the request
  that dropped. So its result frees the same held input, and the runner
  ends the turn only when the agent finishes. Reason: a result with no
  member message IDs marks every message of the turn as answered.
- A drop in a wake-up reply during a background wait gets a continue
  message too. Its answer counts as a wake-up reply, like the reply that
  dropped.
- The continue message says: "The connection to the model dropped before
  your last response finished. Continue from where you stopped. Do not
  repeat work that is already done." Decision 3 can add one sentence.
- A Stop before or during the continue message keeps today's behavior: the
  turn ends as stopped.
- Codex turns get no continue message. Reason: Codex reconnects a dropped
  answer stream by itself, with the default of its `stream_max_retries`
  setting.

## Milestone 1: Documentation and protocol

Depends on: none

Update the docs so that they state the new rules. When the user chooses B
or D for decision 3, add a mockup milestone before this one.

- [ ] Update `docs/protocol/model-gateway-requests.md#streams`: the retry
      of a check that throws, and the warning. Fix both sentences of the
      deploy risk.
- [ ] Update `docs/protocol/messages-and-attachments.md` with the rule of
      the continue message of a Claude turn.
- [ ] Update `worker/model-gateway/README.md`, `runner/behavior.md`, and
      `runner/sdk-helper/README.md` when they describe the changed code.
- [ ] Read both legal pages and each public guide in full. Update each
      sentence that restates a changed fact. Check the rows of the
      Conductor comparison page.

## Milestone 2: Gateway check retry

Depends on: 1

- [ ] In `worker/model-gateway/request-lifetime.ts`, retry a periodic
      check that throws, with backoff, until the lease ends.
- [ ] Get a new Durable Object handle for each check, in `route.ts` and
      `codex-request-auth.ts`.
- [ ] Write the warning of each thrown check, retry, and ended answer.
- [ ] Add cases to `worker/model-gateway/lease.test.ts`: a check that
      throws once keeps the answer open, and a check that keeps throwing
      ends the answer when the lease ends. See each case fail first.

## Milestone 3: Turn check outside the chat queue

Depends on: 2

Only when the user chooses F for decision 1. Otherwise delete this
milestone.

- [ ] Let the periodic check read the turn outside the chat queue, with
      no half-written turn visible to it.
- [ ] Add a test: a check while a lifecycle call holds the queue keeps
      the answer open.

## Milestone 4: Claude continue message

Depends on: 1

- [ ] Find the drop in `runner/sdk-helper/src/providers/claude-events.ts`
      and `claude-outcome.ts`.
- [ ] Send one continue message from `claude.ts` in place of the failure.
      Map it to the member messages of the request that dropped, in
      `claude-input-window.ts`.
- [ ] Add helper tests: a drop sends one continue message and no failure.
      The answer to the continue message answers the original messages. A
      second drop fails the turn. A drop in a wake-up reply stays a
      wake-up. Another error and a Stop keep today's outcome. See each
      case fail first.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the runner checks, and the complete gate
      named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Check that a long Claude turn keeps its answer, or continues by
      itself, when the workspace object resets. An active object takes new
      code up to 5 minutes after a deploy, so stream past that time.
      Also cut an answer during a tool call, and see what Claude keeps.
