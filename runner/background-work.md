# Agent runner: background work

This page belongs to the [agent runner](README.md). It says how the runner
keeps a Claude turn open while the background work of its agent runs. It
also gives the note at the end of a reply, the time limit, the end reason,
and their key code.
[Background work](../docs/protocol/agent-runner.md#background-work) states
the requirements.
[What the chat shows](../docs/protocol/chat-and-events.md#what-the-chat-shows)
states the line of the chat at the limit. A workspace gets this behaviour
only from an org image built with this runner. Codex turns do not wait.

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
- `src/providers/claude-background-note.ts` holds the text of the note. The
  text follows the naming rules of the
  [agent instructions](../docs/protocol/agent-instructions.md#what-the-instructions-hold).

## The time limit

- The turn owns its wait clock. The first wait sets a deadline 30 days
  later. Agent work after a wake-up and each later wait use that deadline.
- A member message during a wait moves the deadline to 30 days after
  the receipt of that message. The runner takes that time before the
  message waits in the queue of its session. A message during agent work
  keeps the deadline.
- At the deadline, an idle wait ends at once. During agent work, the limit
  applies at the end of that reply, also when the last task already ended.
- At the limit, the runner closes the agent process, which ends its tasks.
  It then sends `turn.completed` with the state `finished`, its duration,
  its files, and `endReason: background_work_limit`.
- A timer callback that comes early sets a new timer for the rest of the
  delay. So a clock that moves back cannot lose the deadline.
- One timer waits for at most `MAX_TIMER_MS`, about 24.8 days. Node fires a
  longer timer after 1 ms. So the 30-day wait arms a second timer for the
  rest of the delay.
- Stop and a shutdown clear the timer. Their stopped end has no end reason.
- Saved events keep a known `endReason`. So a resend and a restart keep it.
- Production code uses the fixed limit. `backgroundWorkLimitMs` of
  `EngineOptions` gives a shorter limit only to tests and harnesses.

## Key code

- `src/engine-background.ts`: `BackgroundWait`, the wait clock of one turn,
  with its deadline, its reset at a member message, and its timer. It also
  holds `BACKGROUND_WORK_LIMIT_MS` and `MAX_TIMER_MS`.
- `src/providers/claude-background.ts`: `ClaudeBackground`, the live tasks,
  the ambient task IDs, the scheduled wake-ups, and the idle state of one
  Claude process.
- `src/providers/claude-background-note.ts`: `ClaudeBackgroundNote`, the
  text of the note and the work IDs that the turn named.
- `src/providers/claude.ts`: the state flag, the root Stop hook with its
  note, and the rule that member input stops wake-up results until the next
  wait.
- `src/providers/claude-events.ts`: the level signals and the wake-up
  results.
- `src/engine-input.ts` and `src/engine-runtime.ts`: the wait clock of each
  Claude turn, the receipt time of each message, and deferred input from an
  idle wait.
- `src/engine-events.ts` and `src/engine-finish.ts`: one completion path for
  a result, a wake-up, and the final idle state, and the end with its
  reason.
- `src/stored-events.ts`: the known `endReason` in saved events.

## Tests

- `test-support/background.ts`: `backgroundFixture` joins the real Claude
  adapter and the engine with the fake SDK and fake timers.
- `src/background-turn.test.ts`, `src/background-limit.test.ts`,
  `src/background-input.test.ts`, and `src/background-handoff.test.ts`
  check the wait, the limit, member input, and new agent processes.
- `src/providers/claude-background-note.test.ts` and
  `src/providers/claude-background-note-handoff.test.ts` check the note.
- `src/end-reason.test.ts` checks the end reason in saved events.
- The fake SDK follows the order of the events that the pinned program
  sends. After a change of the SDK pin, check that order again with the
  real program.
