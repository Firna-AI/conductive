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
- The adapter sets `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1`. Without it,
  the pinned program sends no `system/session_state_changed` message, and
  so no idle state. The flag adds no user setting.
- A result that answers each sent message ends no turn while live
  work remains. The turn then waits. The agent process, its profile with
  the turn token, the turn ID, the file baseline, and the output stay.
- After the agent process had live work, a result that answers each sent
  message also starts a wait when no live work remains. That wait
  lasts until a fresh idle state. The agent can stop a task just before it
  ends its reply, and the reply to the notification of that task can come
  before the idle state. The adapter and the engine use this same rule.
  Otherwise the engine waits while the adapter ignores the wake-up reply,
  and the turn never ends.
- During a wait, a result with the origin `task-notification` that answers
  no waiting message ends the reply to a task notification. That reply
  stays in the same turn, and the result frees no held input.
- A new message ends that wait. Until the next wait, the adapter ignores
  task notification results that answer no waiting message, as
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

## Scheduling

- The Claude adapter sets `CLAUDE_CODE_DISABLE_CRON=1` and disallows
  `CronCreate`, `CronDelete`, `CronList`, and `ScheduleWakeup`.
  Older jobs stay in `.claude/scheduled_tasks.json` on disk. The disabled
  scheduler cannot fire them.
- The adapter sets `skillOverrides: { loop: 'off' }` at startup and
  keeps it on model changes. This disables the bundled `/loop` skill.
- The root Stop hook passes the current `session_crons` directly to the
  note. Only tasks count as live work.
- Both agents use `schedule_wake_up` to continue later.
  [Wake-ups](../docs/protocol/wake-ups.md) gives the call and delivery rules.

## The note

- At each try to end a reply, the root Stop hook can return the note in
  `hookSpecificOutput.additionalContext`. It returns the note only when
  it finds a live task or an in-process wake-up that no earlier note of
  the turn named.
- The note gives each new running or pending task and each new
  in-process wake-up one line. Each run of whitespace in a label becomes
  one space.
- For each new in-process wake-up the runner logs one warning. The note
  says that the turn does not wait for it. It asks the agent to set it
  again with `schedule_wake_up`.
- The active turn keeps the IDs of the work that its notes named, also
  across a new agent process. So no second note names the same work. A
  task and a wake-up with the same ID stay apart.
- Completed and ambient work does not enter the set of named IDs. Such work
  still gets its note when it becomes live later.
- The Stop hook of a closed agent process gives no note and adds no named ID.
- `sdk-helper/src/providers/claude-background-note.ts` holds the text of the note. The
  text follows the naming rules of the
  [agent instructions](../docs/protocol/agent-instructions.md#what-the-instructions-hold).

## The time limit

- The turn owns its wait clock. The first wait sets a deadline 30 days
  later. A wait for a fresh idle state after ended work sets it too, so no
  wait lasts past the limit. Agent work after a notification and each
  later wait use that deadline.
- A member message during a wait moves the deadline to 30 days after
  the receipt of that message. The runner takes that time before the
  message waits in the queue of its session. A message during agent work
  keeps the deadline.
- The Worker sets `wakeUp: true` when a scheduled wake-up or watch wake
  joins the turn. Either message keeps the existing deadline, including
  when its delivery needs a new agent process.
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

- [background.rs](../crates/cnd-runner/src/engine/background.rs) keeps the wait deadline and restarts it for member input.
- [input.rs](../crates/cnd-runner/src/engine/input.rs) uses the `wakeUp` flag to keep the deadline when a wake joins the turn.
- [actor.rs](../crates/cnd-runner/src/engine/actor.rs) waits for input, provider events, cancellation, and deadlines.
- [results.rs](../crates/cnd-runner/src/engine/results.rs) resolves exact input lists and idle wake-ups.
- [finish.rs](../crates/cnd-runner/src/engine/finish.rs) closes helpers before the terminal event.
- [claude.ts](sdk-helper/src/providers/claude.ts) disables scheduling and registers the root Stop hook.
- [claude-background.ts](sdk-helper/src/providers/claude-background.ts) tracks live tasks, ambient tasks, and idle state.
- [claude-background-note.ts](sdk-helper/src/providers/claude-background-note.ts) reports each new live task or unexpected in-process wake-up.
- [claude-events.ts](sdk-helper/src/providers/claude-events.ts) maps SDK background signals.

## Tests

- [background_tests.rs](../crates/cnd-runner/tests/engine/background_tests.rs) checks waits, deadlines, member and wake input, and helper handoffs with a paused clock.
- [recovery_tests.rs](../crates/cnd-runner/tests/core/recovery_tests.rs) checks saved terminal reasons and replay.
- [claude-background-note.test.ts](sdk-helper/src/providers/claude-background-note.test.ts) and
  [claude-background-note-handoff.test.ts](sdk-helper/src/providers/claude-background-note-handoff.test.ts) check the note, warnings, and the wait signals.
- [claude-background-wait.test.ts](sdk-helper/src/providers/claude-background-wait.test.ts) checks a reply to a task notification that comes before the idle signal.

The helper uses fake SDK events. Check their real order again after each SDK update.
