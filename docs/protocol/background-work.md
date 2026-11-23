# Background work of Claude turns

This page belongs to [Agent runner](agent-runner.md). It states when a
Claude turn stays open for background work, the note that the agent gets,
and the time limit of a wait. It also states that the agent program keeps
no wake-up of its own. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A background work decision number, such as background work decision
1, names a decision of the change that keeps a turn open for background
work. A wake-up decision number names a decision of the change that adds
the [wake-ups](wake-ups.md), as that doc says.

## Background work

- Live work is each task of the
  [background work](../architecture.md#terms) that runs or waits to start.
  A task that the agent program does not count as activity is not live
  work.
- An in-process wake-up is not live work either, as
  [Wake-ups of the agent program](#wake-ups-of-the-agent-program) says.
- A Claude turn stays open after a reply of the agent while live work
  remains (background work decision 1). Such a time is a wait.
- A [service](services.md) is not live work. It runs outside every turn,
  so it holds no turn open. A temporary check server that an agent runs as
  a task is live work, and the agent ends it before its reply, as
  [Agent guidance](services.md#agent-guidance) says.
- When a task ends, the agent program notifies the agent. The agent then
  works again in the same turn.
- The turn ends when the agent is idle and no live work remains. The agent
  is idle when no reply runs and no message of the turn waits for an answer.
- That end has the state `finished`. Its duration and its files cover the
  whole turn, with each wait.
- Each end of a Claude turn closes the agent program. The close ends its
  tasks, and each in-process wake-up.
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
- A [wake-up](wake-ups.md#the-boundary-of-a-wake-up) keeps this rule too.
  Only a running turn can set it, and only the Worker fires it, once, at
  its time.

### Wake-ups of the agent program

- An in-process wake-up is a wake-up that the agent program keeps in its
  own memory.
- An agent gets no tool that sets an in-process wake-up (wake-up decision
  1 D). So the scheduling tools of Claude are off: `CronCreate`,
  `CronDelete`, `CronList`, and `ScheduleWakeup`. The `loop` skill of
  Claude is off too, for the agent and for a member who names it.
- A Codex agent gets no scheduling tool of its agent program either. Each
  agent sets each wake-up with the Conductive call, as
  [Wake-ups](wake-ups.md) says.
- Reason: an in-process wake-up ends with its turn, and its wait keeps the
  cloud computer running. A Conductive wake-up survives a stop of the
  cloud computer, and both agents follow one rule.
- An in-process wake-up can still appear, such as from a scheduling tool
  that a later agent program adds under a new name. It is no live work, so
  the turn does not wait for it. The runner logs a warning for it.
- The note names such a wake-up once, and it asks the agent to set the
  wake-up again with the Conductive call, as [The note](#the-note) says.
- Reason: the agent program still lists each in-process wake-up, also one
  from a tool with a new name. So this guard works when a tool name
  changes.
- Cron tools that stay beside the Conductive call were rejected. Agents
  could still use them by habit, and those wake-ups still end with their
  turn.
- A rename of `CronCreate` to the Conductive call was rejected. It needs
  the syntax of cron and wake-ups that repeat, and agents learn a tool
  from its description (decision 278). A rename of all four tools, and a
  Conductive `loop` skill that chains wake-ups, were not chosen.

### The note

- At the end of a reply, the agent gets one note when live work holds a
  task that no earlier note of the turn named. It also gets the note for
  an in-process wake-up that no earlier note of the turn named.
- The note names each such task and wake-up, so each one at most once in a
  turn. Reason: a second note for the same work can loop the agent.
- The note is guidance, not an error, so the reply goes on.
- For a task, the note says that the turn stays open while the task runs,
  for up to 30 days. It says that a notification comes when each task
  ends. It asks the agent to stop each task that it does not need, such as
  a dev server.
- For an in-process wake-up, the note says that the turn does not wait for
  it. It asks the agent to set the wake-up again with the Conductive call.
- Then the note asks the agent to end its reply.
- The note also says that a server that a member needs after the reply
  runs as a [service](services.md). This server guidance changes no
  trigger, no wait, and no time limit of this page.
- The note follows the naming rules of the
  [agent instructions](agent-instructions.md#what-the-instructions-hold).
  So it never names a sandbox provider, such as Boat or E2B, and it never
  uses "Claude Code" as a name.
  Reason: the agent can repeat the note in the chat.
- The chat never shows the note. Reason: the note is for the agent.
- A wait with no note was rejected, because a forgotten dev server would
  then hold each turn until the limit.

### The time limit

- A turn waits for at most 30 days. The user chose this limit on
  13 November 2026, in place of the 120 minutes of background work
  decision 2. Reason: background work, such as a long job, can need more
  than 2 hours.
- No limit was rejected, because a forgotten task would then hold its
  sandbox without end.
- The count starts at the first wait. Agent work after a notification
  counts.
- A message of a member that joins the turn during a wait starts the count
  again, from that message. A message during a reply does not change the
  count.
- Reason: the limit bounds the waiting that a turn holds with no new
  message of a member.
- A [wake-up](wake-ups-delivery.md#delivery) that joins the turn is not a
  message of a member. So it does not start the count again. Reason: a
  chain of wake-ups must not keep a forgotten dev server running without
  end.
- Accepted cost: a cloud computer with older software starts the count
  again at such a wake-up, until its update. Reason: an older runner
  cannot tell a wake-up from a message of a member.
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
