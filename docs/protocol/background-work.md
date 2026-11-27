# Background work of Claude turns

This page belongs to [Agent runner](agent-runner.md). It states when a
Claude turn stays open for background work, the note that the agent gets,
and the time limit of a wait. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A background work decision number, such as background work decision
1, names a decision of the change that keeps a turn open for background
work.

## Background work

- Live work is each task of the
  [background work](../architecture.md#terms) that runs or waits to start,
  and each wake-up. A task that the agent program does not count as
  activity is not live work.
- A Claude turn stays open after a reply of the agent while live work
  remains (background work decision 1). Such a time is a wait.
- A [service](services.md) is not live work. It runs outside every turn,
  so it holds no turn open. A temporary check server that an agent runs as
  a task is live work, and the agent ends it before its reply, as
  [Agent guidance](services.md#agent-guidance) says.
- When a task ends or a wake-up fires, the agent program notifies the
  agent. The agent then works again in the same turn.
- The turn ends when the agent is idle and no live work remains. The agent
  is idle when no reply runs and no message of the turn waits for an answer.
  The work of a parked subagent can hold the turn open a little longer, as
  [Work of a parked subagent](#work-of-a-parked-subagent) says.
- That end has the state `finished`. Its duration and its files cover the
  whole turn, with each wait.
- Each end of a Claude turn closes the agent program. The close ends its
  tasks, and each wake-up that it keeps only in memory.
- A waiting turn is a running turn for every other rule. Examples are Stop,
  a shutdown, a message, a model change, the turn token, the idle stop, and
  Continue. So Stop during a wait ends the turn as stopped.
- A Codex turn does not wait, because Codex gives its agent no notification
  when background work ends.
- Reason: the tool text of Claude promises that notification. The wait
  keeps the promise up to the limit, also in an automation run.
- A rule that the agent waits in the foreground for each result was
  rejected, because the tool text still promises the notification.
- Background work turned off was rejected, because agents then lose it also
  inside a turn.
- A new turn that background work starts by itself was rejected, because
  sandbox code could then spend the login of the sender.
- A [watch](session-watches.md#the-boundary-of-a-watch) keeps this rule.
  Only a running turn can set it, and only the Worker fires it, once, at
  the end of the watched turn.

### The note

- At the end of a reply, the agent gets one note when live work holds a
  task or a wake-up that no earlier note of the turn named.
- The note names each such task and wake-up, so each one at most once in a
  turn. Reason: a second note for the same work can loop the agent.
- The note is guidance, not an error, so the reply goes on. It says that
  the turn stays open while the work runs, for up to 30 days. It says that
  a notification comes when each task ends or each wake-up fires.
- The note asks the agent to stop each task that it does not need, such as
  a dev server. It asks the agent to delete each wake-up that it does not
  need. Then it asks the agent to end its reply.
- The note also says that a server that a member needs after the reply
  runs as a [service](services.md). This server guidance changes no
  trigger, no wait, and no time limit of this page.
- The note follows the naming rules of the
  [agent instructions](agent-instructions.md#what-the-instructions-hold).
  So it never names a sandbox provider, such as Boat or E2B, and it never
  uses "Claude Code" as a name.
  Reason: the agent can repeat the note in the chat.
- The chat never shows the note. Reason: the note is for the agent.
- A wake-up that repeats is live work too. Reason: one rule for all
  background work keeps the promise of each tool.
- A wait with no note was rejected, because a forgotten dev server would
  then hold each turn until the limit.

### Work of a parked subagent

- A subagent is an agent that the main agent of a Claude turn starts. A
  subagent that ends its reply while its own task runs is parked. The
  agent program wakes it when that task ends.
- When a task that a parked subagent started ends, the turn stays open for
  a grace time of 2 minutes, so that the agent program can wake the
  subagent (background work decision 4).
- The grace time ends early when the subagent runs again.
- When the subagent does not run again in the grace time, the main agent
  gets a note in the same turn. The note names the task, its subagent, how
  the task ended, and where its output is. It asks the main agent to resume
  the subagent or to finish the work itself.
- Each run of a task gets its own grace time and at most one note in a
  turn.
- A task that an agent stopped gets no grace time and no note.
- A subagent that a parked subagent started gets no grace time and no
  note. Reason: the agent program sends its result to the main agent.
- The turn stays open until the reply to the note ends. That reply is a
  wake-up reply of the same turn. It answers no member message.
- The note follows the rules of [The note](#the-note): the chat never
  shows it, and it follows the naming rules.
- Reason: the agent program sends the result of such a task only to its
  subagent. Without the grace time, the turn could end while the agent
  program wakes the subagent, and the work stopped halfway.
- A note at once, with no grace time, was rejected, because the agent
  program usually wakes the subagent itself. The note would then often be
  a false alarm, and the same work could run twice.
- A grace time with no note was rejected, because a wake that fails would
  still end the turn with the work half done.
- A rule that a subagent waits in the foreground for its own tasks was
  rejected, because it depends on each agent, and a foreground wait stops
  after 10 minutes.

### The time limit

- A turn waits for at most 30 days. The user chose this limit on
  13 November 2026, in place of the 120 minutes of background work
  decision 2. Reason: background work, such as a long job or a scheduled
  wake-up, can need more than 2 hours.
- No limit was rejected, because a forgotten task would then hold its
  sandbox without end.
- The count starts at the first wait. Agent work after a notification
  counts.
- A message of a member that joins the turn during a wait starts the count
  again, from that message. A message during a reply does not change the
  count.
- Reason: the limit bounds the waiting that a turn holds with no new
  message of a member.
- When the limit passes during a reply, the limit applies at the end of
  that reply. Reason: a cut tool call can leave half-done work, such as a
  push without its merge.
- When the limit applies, the runner closes the agent program (background
  work decision 3). The runner then sends `turn.completed` with the state
  `finished`, its duration, its files, and `endReason`.
- This end at the limit holds also when no live work remains at the end of
  that reply.
- `endReason` is an optional field of `turn.completed`. Its one value is
  `background_work_limit`, which marks an end at the limit.
- A stopped end at the limit was rejected, because it shows no duration
  and no files.
- Risk: a wait keeps each right of a running turn, such as its turn token,
  for up to 30 days more, as
  [Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox)
  says.
- Risk: a wait is a running turn, so the
  [idle stop](workspace-life.md#stop-and-resume) does not stop its
  sandbox. A task that the agent does not stop, such as a dev server, can
  keep the sandbox running for up to 30 days.
