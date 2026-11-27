# Agent runner: background work

This page belongs to the [agent runner](README.md). It says how the runner
keeps a Claude turn open while the background work of its agent runs. It
also gives the note at the end of a reply, the time limit, the end reason,
and their key code.
[Background work](../docs/protocol/agent-runner.md#background-work) states
the requirements.
[What the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows)
states the line of the chat at the limit. An automatic update gives existing workspaces this behavior. Codex turns do not wait.

## The wait

- The Claude adapter keeps the live work of its agent process. Each
  `system/background_tasks_changed` message replaces its set of tasks. A
  task that the message marks as `ambient` is not live work.
- The root Stop hook gets the scheduled wake-ups in `session_crons`. Each
  call of the hook replaces that snapshot. One-time and repeating wake-ups
  both count.
- The adapter sets `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1`. Without it,
  the pinned program sends no `system/session_state_changed` message, and
  so no idle state. The flag adds no user setting.
- A result that answers each sent member message ends no turn while live
  work remains. The turn then waits. The agent process, its profile with
  the turn token, the turn ID, the file baseline, and the output stay.
- After the agent process had live work, a result that answers each sent
  member message also starts a wait when no live work remains. That wait
  lasts until a fresh idle state. The agent can stop a task just before it
  ends its reply, and the reply to the notification of that task can come
  before the idle state. The adapter and the engine use this same rule.
  Otherwise the engine waits while the adapter ignores the wake-up reply,
  and the turn never ends.
- During a wait, a result with the origin `task-notification` that answers
  no waiting message ends a wake-up reply. That reply stays in the same
  turn. The result answers no member message, and it frees no held input.
- A member message stops such results from counting as wake-ups, until the
  next wait. Outside a wait, the adapter ignores them, as
  [What it does](README.md#what-it-does) says.
- A task that leaves the set, and the start of each Stop hook, make an
  earlier idle state stale. The program can remove a task before the reply
  to its notification starts.
- The turn ends when a fresh idle state comes and no live work remains.
  That end takes the common completion path. So it also applies an elapsed
  limit and starts deferred input.
- Deferred input during an idle wait starts its new agent process at once.
  The new process keeps the deadline of the turn. Its live work starts
  empty, because the old process closes and its work ends with it.

## The note

- At each try to end a reply, the root Stop hook can return the note in
  `hookSpecificOutput.additionalContext`. It returns the note only when
  live work holds a task or a wake-up that no earlier note of the turn
  named. Otherwise it returns no output, and the reply ends.
- The note lists only that new work: each running or pending task, and each
  scheduled wake-up, on one line. Each run of whitespace in a label becomes
  one space.
- The active turn keeps the IDs of the work that its notes named, also
  across a new agent process. So no second note names the same work. A
  task and a wake-up with the same ID stay apart.
- Completed and ambient work does not enter the set of named IDs. Such work
  still gets its note when it becomes live later.
- The Stop hook of a closed agent process gives no note and adds no named ID.
- `sdk-helper/src/providers/claude-background-note.ts` holds the text of the note. The
  text follows the naming rules of the
  [agent instructions](../docs/protocol/agent-instructions.md#what-the-instructions-hold).

## Work of a parked subagent

[Work of a parked subagent](../docs/protocol/background-work.md#work-of-a-parked-subagent)
states the requirement.

- The adapter keeps the description, the run ID, and the owner of each
  listed task until its agent process ends. The owner is the
  `parent_task_id` of the entry. The pinned program can drop that field
  once the owner stops, so the adapter keeps the first value it saw.
- It reads `task_started` for the tool use ID of each subagent, and
  `task_notification` for the end status and the output file of each task.
- A listed task leaves the list while its owner is not listed. The adapter
  then starts the grace time for that task, unless its status is
  `stopped`, or an earlier note of the turn named its run. Tasks that
  leave in one list change share one grace time.
- While a grace time runs, `ClaudeBackground.live` is true. So the engine
  keeps the turn open with its current rules, and the Rust engine needs no
  change.
- The grace time ends early when the owner is listed again, or when an
  `assistant` message of the owner arrives. A delivered notice alone does
  not end it.
- At the end of the grace time, the adapter sends one user message with the
  note on the input path, with the priority `next`. Its key
  `orphan:<task>:<run>` joins the set of named work of the turn.
- `live` stays true until a result names the note message. A result that
  answers only note messages is a wake-up reply. It frees no held input.
- A probe with the pinned program, 0.3.318, showed this order: the shell
  of a parked subagent leaves the list, and the subagent joins the list
  again 10 ms later with a new run ID. Check it again after each SDK
  update.

## The time limit

- The turn owns its wait clock. The first wait sets a deadline 30 days
  later. A wait for a fresh idle state after ended work sets it too, so no
  wait lasts past the limit. Agent work after a wake-up and each later wait use that deadline.
- A member message during a wait moves the deadline to 30 days after
  the receipt of that message. The runner takes that time before the
  message waits in the queue of its session. A message during agent work
  keeps the deadline.
- At the deadline, an idle wait ends at once. During agent work, the limit
  applies at the end of that reply, also when the last task already ended.
- At the limit, the runner closes the agent process, which ends its tasks.
  It then sends `turn.completed` with the state `finished`, its duration,
  its files, and `endReason: background_work_limit`.
- Tokio waits for the full deadline. Each wake checks the clock again.
  A clock change cannot end the wait before its deadline.
- Stop and a shutdown clear the timer. Their stopped end has no end reason.
- Saved events keep a known `endReason`. So a resend and a restart keep it.
- Production code uses the fixed limit. `background_limit` of
  `EngineDependencies` gives a shorter limit only to tests and harnesses.

## Key code

- [background.rs](../crates/cnd-runner/src/engine/background.rs) keeps the first wait deadline and member receipt time.
- [actor.rs](../crates/cnd-runner/src/engine/actor.rs) waits for input, provider events, cancellation, and deadlines.
- [results.rs](../crates/cnd-runner/src/engine/results.rs) resolves exact input lists and idle wake-ups.
- [finish.rs](../crates/cnd-runner/src/engine/finish.rs) closes helpers before the terminal event.
- [claude-background.ts](sdk-helper/src/providers/claude-background.ts) tracks live tasks, ambient tasks, and scheduled wake-ups.
- [claude-background-note.ts](sdk-helper/src/providers/claude-background-note.ts) formats each new-work note.
- [claude-events.ts](sdk-helper/src/providers/claude-events.ts) maps SDK background signals.
- [claude-orphans.ts](sdk-helper/src/providers/claude-orphans.ts) holds the grace time of the work of a parked subagent and sends its note.
- [claude-orphan-note.ts](sdk-helper/src/providers/claude-orphan-note.ts) formats that note.

## Tests

- [background_tests.rs](../crates/cnd-runner/tests/engine/background_tests.rs) checks waits, deadlines, member input, and helper handoffs with a paused clock.
- [recovery_tests.rs](../crates/cnd-runner/tests/core/recovery_tests.rs) checks saved terminal reasons and replay.
- [claude-background-note.test.ts](sdk-helper/src/providers/claude-background-note.test.ts) and
  [claude-background-note-handoff.test.ts](sdk-helper/src/providers/claude-background-note-handoff.test.ts) check helper task and note behavior.
- [claude-background-wait.test.ts](sdk-helper/src/providers/claude-background-wait.test.ts) checks a wake-up reply after a task that ended before the reply.
- [claude-orphan-task.test.ts](sdk-helper/src/providers/claude-orphan-task.test.ts) checks the grace time, the note, and its wake-up reply.

The helper uses fake SDK events. Check their real order again after each SDK update.
