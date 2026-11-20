# Provider stops

This doc holds the requirements and the decisions in force for a turn that
a provider stop ends. It covers which turns continue, the end of such a
turn, the continuation turn, the line of the chat after the stop, and the
end of a chain of continuation turns. It belongs to
[Messages and attachments](messages-and-attachments.md), which covers the
messages and the turns of a session.
[Stops by a provider](stop-and-resume.md#stops-by-a-provider) states
which stops are provider stops, and the start of the sandbox after such a
stop. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A provider stop decision number, such as provider stop decision 1,
names a decision of the change that continues the work after a provider
stop. The [mockup catalogue](../mockups/catalogue.md) draws the lines at
`app/chat/cloud-computer-stops`.

## Terms

- **Provider stop:** a stop of a sandbox that the app did not ask for, as
  [Stops by a provider](stop-and-resume.md#stops-by-a-provider) says.
- **Continuation turn:** a turn that the workspace queues after a provider
  stop, so that the agent continues the work of the turn that the stop
  ended.
- **Chain:** a turn with a message of a member, and the continuation turns
  that follow it, one after another.

## The work goes on

- After a provider stop during a turn, the workspace ends that turn with
  its own line. It then queues a continuation turn, and the app starts the
  sandbox again (provider stop decision 1). The user chose this on
  20 November 2026.
- Reason: the work goes on while no member watches. A rule that changes
  nothing was rejected, because a member must then notice the stop, resume
  the workspace, and ask the agent to continue. A continuation only at the
  next open was rejected, because a member must still open the workspace.
- One turn across the stop, through a new runner, was rejected. It is the
  largest change, and it needs new runner messages. Older runners would
  still need the continuation turn.
- A start of the sandbox while the old turn stays open was rejected. It is
  large, and the runtime limit of E2B always starts a new machine.
- A planned restart before the runtime limit, from the end time that a
  provider reports, was left out for now. It is more work, and only a
  provider that reports an end time gets it.
- A pause that keeps the memory of the sandbox was rejected. A stop ends
  every process, as [The stop](stop-and-resume.md#the-stop) says, and E2B
  would then keep secrets in its saved memory.
- An automatic Try again of the message of the turn was rejected, because
  it gives the agent the whole request again. A restart of the turn by the
  runner alone was rejected, because the runner has no turn token.

## Which turns continue

- Each provider stop during a running turn starts a continuation (provider
  stop decision 2). The user chose this on 20 November 2026.
- A continuation only after a stop at a known runtime limit was rejected,
  because the workspace cannot always tell the causes of a stop apart.
- A continuation also after a crash of the runner with no provider stop
  was rejected, because it adds the queue of a continuation on a second
  path.
- A rule that leaves out a stop that sandbox code caused, from the end
  time that E2B reports, was not chosen. It works only on E2B, and it is a
  guess from times.
- A continuation after the error state of a provider was not chosen, as
  [Stops by a provider](stop-and-resume.md#stops-by-a-provider) says. A
  resume of a Boat sandbox in the error state can lose its newest writes.
- A turn continues only when no member asked for its end, and when it does
  not already fail. A turn with a Stop request, a turn that a close of its
  session stops, and a turn that fails for its login end as before. They
  get no continuation and no line of the app.
- Each running turn of each session continues in its own session.

## The end of the turn

- The ended turn ends as stopped, with the end reason
  `cloud_computer_stopped`. Only the workspace sets this end reason. The
  runner never sends it.
- Its stopped line names that cause, "The cloud computer stopped", in
  place of "The agent stopped".
  [Messages](messages-and-attachments.md#messages) states the other
  stopped lines.
- The turn ends in this way also when no continuation turn follows it.
- An older copy of the app drops the unknown end reason, and it shows
  "The agent stopped".

## The continuation turn

- The continuation turn comes directly after the ended turn. It runs
  before each turn that waited in the same session.
- It acts for the sender of the ended turn, under the login rules of that
  sender. [Late answers](secret-late-answers.md#late-answers) states the
  same rule for the turn of a late answer. So its GitHub token, its Mac
  requests, and the writes of its workspace tools follow that sender.
- It holds each message of the ended turn that the agent did not get. An
  example is a message that a member sent after the stop, before the
  workspace found the stop.
- When the runner never started the ended turn, the continuation turn
  gives the agent the messages of that turn as they were. It adds no text
  of the app.
- Otherwise, the continuation turn starts with a message of the app. The
  chat does not show this message, and it is not a message of a member.
- Each ended turn gets at most one continuation turn, also when the
  workspace handles the same stop again.
- When the sender can no longer use the login of the session, the
  workspace queues no continuation turn, and the app starts no sandbox.
  Examples are a login that is gone, a starter who does not share the
  login with that sender, and a sender who left the org.
- Reason: a continuation turn then acts as a turn of a late answer does,
  and the share setting of each login keeps its rule.

### The message of the app

- The message of the app says these things:
  - It comes from Conductive, not from a member.
  - The cloud computer of the workspace stopped while the agent worked,
    and it started again.
  - The processes of the agent may have ended, also its background tasks,
    its dev servers, and its shells.
  - The agent continues the task from where it stopped, and it does not
    repeat work that is done.
  - Before the agent repeats an action outside the cloud computer, it
    checks whether that action already happened. Examples are a push, a
    pull request, and a message.
- The message also names the session of the ended turn, which holds the
  work (provider stop decision 7). When the agent lacks the context of the
  task, the message tells it to read that session with `read_session`, as
  [Read a session](session-calls.md#read-a-session) says. The user chose
  this on 20 November 2026.
- Reason: a new session that a Try again starts has none of the earlier
  history. The name of the session then gives its agent a way back to the
  task.
- Try again of a failed continuation turn sends the message of the app
  again, as a new message of the app. The chat does not show it either.
- That Try again acts for the member who presses it, as each Try again
  does. When that member cannot use the login of the session, the Try
  again starts a new session, as
  [Messages](messages-and-attachments.md#messages) says. The message in the
  new session still names the session of the ended turn.
- A rule that changes nothing was rejected. The agent of such a new
  session would then have no way back to the task. A member would have to
  give the task again.
- A Try again that acts for the sender of the failed turn was rejected.
  The press of another member would then spend the login of that sender.
  Its turn would also use the GitHub token and the Mac of that sender.
- A message of the app that names the earlier session in each new session
  was rejected. It changes each new session that a message of a member
  starts. It also adds a message of the app to the first turn of each such
  session.
- The message follows the naming rules of
  [the agent instructions](agent-instructions.md#what-the-instructions-hold).
  So it never names a sandbox provider, and it never uses "Claude Code" as
  a name. Reason: the agent can repeat the message in the chat.

## The line after the stop

- Right under the stopped line of the ended turn, a line of the app says
  what comes next. It does not repeat the cause, because the stopped line
  names it.
- When a continuation turn waits, the line says "The agent continues when
  the cloud computer starts again". The continuation turn starts at this
  line in the chat.
- When the login of the session is gone, the line names who connects that
  login again, in the words of the line of a
  [late answer](secret-late-answers.md#late-answers):
  - For a personal login, it says "The agent can continue after Cal
    connects Claude again". To Cal, it says "The agent can continue after
    you connect Claude again".
  - For the org login, it says "The agent can continue after an admin
    connects Acme's Claude login again".
- The line says "can continue", because no turn waits, and a reconnect
  starts none. "The agent continues when Cal connects Claude again" was
  rejected, because no turn would follow.
- In each other case with no continuation turn, the line says "Send a
  message to continue". Examples are a sender who can no longer use the
  login for another reason, and the [end of a chain](#the-end-of-a-chain).
- No line names a provider. No line says that the cloud computer started
  before it did. Each line ends with no period, as the other event lines of
  the chat do.
- A line that starts with "The cloud computer stopped while the agent
  worked." was rejected, because it repeats the stopped line right above
  it.
- [Events](chat-and-events.md#events) states the event of the line.

## The end of a chain

- A chain goes on while less than 30 days have passed since its start
  (provider stop decision 3). These are the 30 days of
  [The time limit](background-work.md#the-time-limit). No limit counts the
  continuation turns of a chain. The user chose this on 20 November 2026.
- A chain starts at the newest message of a member in its turns. A message
  of the app does not count, such as the message of a continuation turn.
- A turn that a late answer to a secret request starts holds no message of
  a member. Its chain starts when the late answer starts that turn.
- Reason: the answer of a member is an action of a member at that time,
  as a message is.
- Reason: the count of a wait starts at the same time as its chain, or
  later. So the workspace queues no continuation after the time limit of a
  wait has passed.
- A continuation turn that a provider stop ends less than 15 minutes after
  the runner started it gets no further continuation turn (provider stop
  decision 3). A continuation turn that the runner never started counts as
  such a turn too.
- Reason: a turn that never started did no work, and sandbox code that
  powers off the sandbox at its start would otherwise start it again and
  again.
- Reason: code in the sandbox on E2B can power off the sandbox again and
  again, and each power-off would start a new turn.
- At the end of a chain, and at this 15-minute rule, the ended turn gets
  no continuation turn, and the app starts no sandbox. The line after the
  stop then says "Send a message to continue".
- A message of a member starts a new chain. The 15-minute rule of an
  earlier chain does not hold for it.
- A count limit was rejected, such as one continuation for each message of
  a member, or up to 3 continuations in a row. Reason: a long task can meet
  the runtime limit of E2B many times.
- No limit was rejected, because a chain would then have no end. The 30
  days alone were rejected, because of the loop of power-offs.
- The workspace checks the 30 days only when it queues a continuation turn
  (provider stop decision 4). A continuation turn that already runs counts
  its own wait, as each turn does. So it can wait for its background work
  past the end of its chain. The user chose this on 20 November 2026.
- Reason: such an overrun follows only a rare stop on Boat. On E2B, the
  next pause comes within one runtime limit.
- A stop of the turn by the workspace at the end of its chain was
  rejected. The turn then shows no duration and no files.
- A new field of the turn command with the end of the chain was rejected.
  It changes the runner messages for little gain.
- An automation run takes the outcome of the last turn of the chain of its
  first turn. So a chain that ends with no continuation turn fails that
  run, as [Run states](automation-runs.md#run-states) says (provider stop
  decision 6).
