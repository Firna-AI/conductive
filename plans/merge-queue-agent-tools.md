# Agent tools for the merge queue

Status: Active. On branch `calummoore/manage-merge-queue-7inl`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents cannot see the merge queue, and no workspace tool changes it.
[Merge queue](../docs/protocol/merge-queue.md) says: "The agent tools do
not add to, remove from, or re-order a queue." A member must make each
queue change in the app. This change gives the workspace tools, the MCP
server and the CLI, five new Worker calls: one read of the queues of the
org, and add, remove, move, and merge for one entry. Each change acts for
the sender of the calling turn, through the same queue code as the app.
The change adds no screen, so it has no mockup milestone. It does not add
Merge stack, a wake when an entry merges or fails, or a member approval
step.

The request came from Cal on 2026-11-26: "add conductive mcp to manage
the merge queue, so the agent can view and control it". It replaces the
follow-up item `plans/follow-ups/merge-queue-agent-tools.md`. The
brainstorm notes are in `.context/merge-queue-agent-tools/brainstorm.md`.

Contract owners:

- [Merge queue](../docs/protocol/merge-queue.md).
- [Agent tools](../docs/protocol/agent-tools.md) and
  [Agent tool access](../docs/protocol/agent-tool-access.md).
- A new protocol page, `docs/protocol/merge-queue-calls.md`, for the
  calls.
- The [tools README](../tools/README.md) and
  [tool calls](../tools/calls.md).
- The [cnd-tools README](../crates/cnd-tools/README.md).

## Decisions

A queue tools decision number names a decision of this change. The
protocol docs cite each one as "queue tools decision N".

### Queue tools decision 1: which entries an agent may change

- **Decided:** B, by Cal on 2026-11-27.
- **Root question:** Which queue entries may an agent change, and for whom?
- **Shared assumptions:**
  - Agents act through the workspace tools on fixed `/v1/tools/` routes
    ([Agent tools](../docs/protocol/agent-tools.md)).
  - Each change needs an active turn and acts for the sender, with the
    rights of the sender in the app (decisions 50 and 277).
  - The rules of the queue stay: units, the leave, the readiness, and the
    token of the queuer (decisions 313 to 324).
  - A read needs only the workspace token and has no sender
    (decisions 257 and 282).
- **Options:**
  - **A.** Self-service. Agents read every queue, and change only the
    entry of the calling workspace. Cost: it breaks the rule that all
    calls have one reach. It protects little, because an agent can send a
    message to the agent of another workspace. Effort: Medium.
  - **B.** Parity with the app. Agents read every queue of the org, and
    change the entry of any workspace of the org. Each change acts as the
    sender and needs the GitHub write access of the sender. Cost: an agent
    can remove or re-order the entries of other members in the name of the
    sender. A removed entry loses its place. Effort: Medium.
  - **C.** Added by the options check. B, but remove and move act only on
    entries whose queuer is the sender. Cost: a second set of rights below
    the app, against decision 277, and a new refusal. A member who asks an
    agent to re-order the queue gets a refusal for the entries of other
    members. Effort: Medium.
- **Left out:**
  - No calls, a read only, and an add call only: they fail "view and
    control".
  - The agent proposes and a member confirms: Large, and decision 277
    rejected an approval for each call.
  - An org setting that turns agent queue writes on: Agent tool access
    rejected an org setting for the reach, for its cost.
  - One call that sets the whole order: the move call already reaches each
    order, one unit at a time, as a drag does. A left-out entry would also
    lose its place.
  - An agent that keeps the order itself with `gh`: decision 313 rejected
    this.
  - A GitHub label or GitHub auto-merge as the trigger: no view, no
    refusal, and auto-merge breaks the stack.
  - One generic call to the routes of the app: decision 277 rejected it.
  - A bot, the org, or the workspace owner acts: it breaks decision 50.
  - Entries of agents wait for a press of Merge: decision 314 rejected it.
  - An add that wakes the agent on a failure: it conflicts with the
    choice of 22 November 2026 that a member handles each failure.
- **Reason:** B meets "view and control" under the tool rules in force.
  Agents can already make an entry leave with an archive or with `gh`. The
  options check kept B: C protects only the order of the entries of other
  members, and it costs a second set of rights and a new refusal.

### Queue tools decision 2: a merge at once from an agent

- **Decided:** B, by Cal on 2026-11-27.
- **Root question:** May an agent land queued pull requests at once, or
  only let the queue land them?
- **Options:**
  - **A.** No merge call. The queue merges ready entries by itself. Cost:
    a member must press Merge for an urgent merge. Effort: Small.
  - **B.** A merge call that works as Merge on a queued workspace in the
    app. It takes the number of entries ahead, and it uses the GitHub
    token and the merge method of the sender. Cost: an agent can land the
    ready entries of other members at once, without the wait of up to 15
    minutes. A merge into the default branch can deploy at once. Effort:
    Small.
- **Left out:**
  - A direct merge outside the queue: decision 316 rejected it.
  - Merge now, which moves the entry to place 1: decision 316 rejected it,
    and the move call gives the same result.
  - A merge after a member approval: decisions 228 and 277 rejected it.
  - A block of `gh pr merge` on a queued pull request: the GitHub user
    token goes to GitHub directly, so the Worker cannot filter its calls.
- **Reason:** the agent then uses the checked path of the queue, not
  `gh pr merge`, and the call lands only ready entries.
- **Both options:** the agent instructions and the tool descriptions say
  never to merge a queued pull request with `gh pr merge`.

### Queue tools decision 3: a removal that takes more entries

- **Open.** Raised by the options check on 2026-11-27.
- **Severity:** Medium. **Effort:** Small.
- **Background:** In the app, Remove from queue asks first. The question
  names the planned base and the upper entries of the unit that leave with
  the selected pull request
  ([Remove from queue](../docs/protocol/merge-queue-in-the-app.md#remove-from-queue)).
  A removed entry cannot get its place back. `close_session` has a
  precedent: a close of a session with a running turn needs
  `stopRunningTurn`, else HTTP 409 `stop_confirmation_required`.
- **Problem:** The removal call has no question and no choice. A removal
  of a lower entry also removes the upper entries of its unit, which can
  belong to other members.
- **Root question:** How does an agent learn, before the change, that a
  removal takes more entries out of the queue?
- **Options:**
  - **A.** No choice. The read and the tool description name the entries
    that leave. The reply shows the queue after the change. Cost: the agent
    learns the effect only after the change. Effort: Small.
  - **B.** A choice in the form of the stop choice, `removeEntriesAbove:
    true`. The Worker needs it only when the removal also takes upper
    entries. Without it, the call gets HTTP 409 with a new error code, and
    the message names those entries. Cost: a new refusal, and a rule that
    the app route does not have. Effort: Small.
  - **C.** The call takes the list of the workspaces that the agent
    expects to leave. The Worker refuses a list that differs from the
    removal plan. Cost: a new refusal, and one more input on each removal.
    Effort: Small.
- **Left out:**
  - A choice on every removal: the call already names the one entry that
    leaves, so B is better on every point.
  - A member approval: decision 277 rejected it.
- **Recommendation:** B. It keeps the question of the app for the one case
  where the agent can miss the effect, and it costs one field.
- **Blocks:** the remove call in Milestones 1, 2, 3, and 4. The other calls
  do not wait.

### Design calls

My calls, on 2026-11-27, under the decision test of the
`decisions-and-findings` skill:

- **Who acts:** the sender becomes the queuer of an add and the merger of
  a merge. An add on a draft marks it ready with the token of the sender.
  Reason: the app does the same for the member who presses.
- **Rights:** the queue code checks the GitHub write access of the sender,
  as for the app. A sender without it gets HTTP 403 with
  `merge_queue_write_required`. Reason: decision 277.
- **No approval step.** The tool description says to change the queue
  only when a member asks, and to tell the member which entries leave with
  a removal. Reason: decision 277. Queue tools decision 3 holds the choice
  for a removal that takes more entries.
- **Automation runs:** the same rules as every other turn. Reason: Agent
  tool access rejected a smaller reach for runs.
- **The read:** one call lists the queues of the org. It can take a
  repository ID, as `list_repositories` gives it. Each queue gives its repository and its default branch,
  and its entries in place order. Each entry gives its place, its unit,
  its state, its pull request number, and the workspace with its ID,
  number, name, link, and branch. When the queue stores them, it also
  gives the wait, the pull request that blocks it, and the entries that
  leave with a removal. Reason: an agent needs these facts to choose a
  call.
- **No queuer and no write access in the read.** Reason: write access is
  a fact of the viewer, and a read has no sender (decisions 257 and 282).
  The app names no queuer, so the read does not either. Every member
  already sees each queue of the org, so the read shows nothing new.
- **Branch names:** the read gives raw branch names, as the other tool
  replies do. Reason: `worker/tools/workspace-data.ts` already gives raw
  branch names, and the filtered labels exist for the screens.
- **Replies:** add, remove, and move reply with the queue of the
  repository after the change. Merge replies at once, with the queue whose
  entries now merge. Reason: the app route returns 202 for a merge, and an
  agent can read the queue again. When the send of a merge fails, the job
  retries on its alarm. The reply can then show the entries as queued, and
  a second call gets HTTP 409 `merge_queue_merging`. The tool description
  says so.
- **No Merge stack call.** Reason: it needs the stack facts that only the
  bar shows. An agent can add the upper pull requests instead.
- **Names:** MCP `list_merge_queues`, `add_queue_entry`,
  `remove_queue_entry`, `move_queue_entry`, and `merge_queue_entry`. CLI
  `conductive merge-queues list` and
  `conductive queue-entries add|remove|move|merge`. Reason: decision 278
  gives a verb and a noun, and says that names matter little.
- **Routes:** `GET /v1/tools/merge-queues`, and `POST` on
  `/v1/tools/workspaces/{workspaceId}/merge-queue/{add|remove|move|merge}`.
  `current` names the calling workspace. Reason: the other workspace
  writes use `POST` on a fixed action path, and the token gate keeps one
  list of routes.
- **Move input:** a workspace ID of the unit that the entry moves before,
  or `null` for the end, as in the app.
- **Merge input:** `ahead`, the number of entries ahead of the target.
  The Worker refuses a value that is not the place minus one, as in the
  app. It replies HTTP 409 `merge_queue_not_ready`. The same code covers
  layers that are not ready and unpushed work, so the tool description
  says to push, then read the queue again.
- **Older tools and Workers:** the calls only add. Older tools do not
  offer them. A newer tool that meets an older Worker, after a rollback,
  gets HTTP 501 from the stub of the machine host, with no error code.
  Today the tools then say "Check its fields and try again." The tools
  give a clear message for HTTP 501 with no error payload instead, such as
  "The Worker does not have this call yet. Try again later." Reason: the
  options check found the 501. The fix is Small, it is in the crate that
  Milestone 4 changes, and a follow-up item would cost more than the fix.
- **No mockup:** a tool call has no screen. The app shows each change of
  an agent in the same way as the change of a member.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the new calls, their access, and the two
decisions. The public guides and the legal pages restate what agents can
do, so they change in the same milestone.

- [ ] Add `docs/protocol/merge-queue-calls.md` with the five calls, their
      inputs, their replies, their refusals, and queue tools decisions 1
      and 2. Link it from `docs/architecture/protocol-docs.md`.
- [ ] Replace the line "The agent tools do not add to, remove from, or
      re-order a queue" in `docs/protocol/merge-queue.md` with the rule of
      queue tools decision 1, and link the new page.
- [ ] Update `docs/protocol/agent-tools.md`: the call count, a queue line
      in the list of calls, and the tool descriptions.
- [ ] Update `docs/protocol/agent-tool-access.md`, `isolation.md`,
      `automation-risks.md`, `tokens-and-secrets.md`,
      `github-tokens-worker.md`, and `agent-instructions.md`, where they
      list what the tools can change or whose token a queue step uses.
      `isolation.md` and `automation-risks.md` also say that a queue
      change from the tools can start restack turns in other workspaces,
      as messages of each queuer.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates what agents can do or how the queue merges.
- [ ] Read the Terms and the Privacy page in full, with their parts such
      as `terms-org.ts` and `privacy-*.ts`. Update each sentence that
      restates these facts. When the Terms text changes, set the effective
      date in `src/marketing/terms.ts`.
- [ ] Delete `plans/follow-ups/merge-queue-agent-tools.md`, because this
      change replaces it.

## Milestone 2: Shared types

Depends on: 1

Rust owns the types of the tool calls in `crates/cnd-runner-interface/`.

- [ ] Add the request and reply types of the five calls to
      `crates/cnd-runner-interface/src/tools/`, beside `merge_queue.rs`.
      Keep each file under 300 lines.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings`
      and commit `src/shared/generated/`.
- [ ] Add the routes to `MACHINE_PATHS` in `src/shared/agent-tools.ts`.

## Milestone 3: Worker routes

Depends on: 2

- [ ] Add the read route under `worker/tools/`, from the stored queue
      data, with the org of the calling workspace only.
- [ ] Add the four change routes. Each one needs the calling turn, takes
      the sender from the record of that turn, and calls
      `changeMergeQueue` of the queue object, as
      `worker/app-api/merge-queue.ts` does.
- [ ] Add the routes to the token gate list in `worker/tools/lists.ts`.
- [ ] Add tests: the read, each change, a sender without write access, a
      write without a calling turn, a workspace of another org, a bad
      `ahead`, and a bad move target. Add a read test for two orgs that
      saved the same repository: each org sees only its own entries.
- [ ] Update `worker/tools/README.md`.

## Milestone 4: Rust tools

Depends on: 2

- [ ] Add the five calls to `crates/cnd-tools/`: the MCP tools in
      `mcp-tools.json`, the CLI commands, the help, and the call list in
      `call.rs`.
- [ ] Write each tool description with the facts of the design calls:
      which calls need a turn, that they reach each workspace of the org,
      that they act as the sender, the removal and the merge effects, and
      the rule against `gh pr merge` on a queued pull request.
- [ ] Give a clear message for HTTP 501 with no error payload, in
      `crates/cnd-tools/src/error.rs`, as the design call "Older tools and
      Workers" says.
- [ ] Add tests for the MCP and CLI inputs and replies, and for the 501
      message.
- [ ] Update `tools/README.md`, `tools/calls.md`,
      `crates/cnd-tools/README.md`, `crates/cnd-cli/README.md`, and
      `runner/agent-tools.md`.
- [ ] Run the Rust checks of `CLAUDE.md`.

## Milestone 5: Agent instructions

Depends on: 4

- [ ] Add a line about the queue calls to the instructions in
      `crates/cnd-runner/src/engine/instructions.rs`, with its test. The
      line says that an add schedules a merge into the default branch as
      the sender. It says never to merge a queued pull request with
      `gh pr merge`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests, the complete gate, and the Rust checks of
      `CLAUDE.md`.
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

- [ ] After the deploy and a sandbox update, an agent lists a queue, adds
      a test pull request, moves it, and removes it.
