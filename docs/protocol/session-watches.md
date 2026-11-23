# Session watches

This doc holds the requirements and the decisions in force for the watch
call of the workspace tools, and for the wake that it asks for. With the
call, an agent asks to learn when one turn of a session ends. It can then
end its reply, and its cloud computer can stop. It belongs to
[Session calls](session-calls.md), which gives the route of the call and
the rules that the session calls share. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A watch decision number names a decision of the change that adds
the watch call. The [mockup catalogue](../mockups/catalogue.md) draws the
wake at `app/chat/wakes`.

## Terms

- The calling turn, the sender, and a write are the terms of
  [Agent tool access](agent-tool-access.md#terms).
- **Calling session:** the session of the calling turn.
- **Watched turn:** the one turn whose end a watch waits for.
- **Watch:** the record of the Worker that asks for one wake when the
  watched turn ends.
- **Wake:** the line of the app that a watch sends to the calling session.
  It says how the watched turn ended, and it starts or joins a turn there.

## The call

- `watch_session` and `conductive sessions watch` take the workspace, the
  session, and an optional turn ID (watch decision 2 D).
  [The calls](session-calls.md#the-calls) gives the route.
- The call is a write. So it needs an active turn, and it follows the
  reach and the archive rule of each session write. Each member of the org
  can make the call.
- The Worker takes the calling session and the sender from its record of
  the calling turn. The call names neither.
- A watch field on `send_message`, `create_session`, and
  `create_workspace` was rejected (watch decision 2). It changes three
  request bodies, and a turn ID closes the same gap.

## The watched turn

- With a turn ID, the call watches that turn of the session. The replies of
  `send_message` and `create_session` give that ID, and so does the reply
  of [Create a workspace](workspace-calls.md#create-a-workspace).
- An unknown turn, or a turn of another session, gets HTTP 404 with the
  error code `turn_not_found`.
- Without a turn ID, the call watches the turn that makes the session
  `running`, as [List the sessions](session-calls.md#list-the-sessions)
  says. A session without such a turn gets the result `idle`, and the call
  sets no watch.
- When the named turn already ended, the result is its end. The call sets
  no watch and sends no wake. Reason: the calling agent is active, so it
  can read the end at once.
- A call whose watched turn is the calling turn gets HTTP 400 with the
  error code `invalid_input` (watch decision 3 C). This holds also for a
  call without a turn ID on the calling session. Each other turn of the
  calling session follows the rules above.
- Reason: a watch of its own turn wakes the session after its own reply,
  also after a Stop. A self-watch under the normal rules, a reply that sets
  no watch, and a self-watch that skips a stopped end were rejected.
- A watch waits for one exact turn. It never follows a message into a
  later turn, and it never waits until the whole session is idle. Reason:
  the task asks for the end of one turn, and those ways change that unit.

## The reply

- The reply gives the watched workspace, the session with its link, and
  one result:
  - `watching`, with the watch ID and the turn ID: the call set a watch.
  - `idle`: the session has no turn to watch.
  - `finished`, `failed`, or `stopped`, with the turn ID: the turn already
    ended.
- The reply comes at once. It never waits for the end of the turn.

## Repeats

- Calls of the same calling session and the same sender for the same
  watched turn give one watch, with one watch ID (watch decision 4 C).
  That watch sends one wake.
- This holds until an explicit Stop of the calling session. A call after
  that Stop sets a new watch, as [Stop](#stop) says.
- A call of another calling session, or of another sender, sets its own
  watch, with its own wake.
- Reason: a retry after a lost reply is a new call of the tool, with a new
  request ID. So only the identity of the watch can merge it. A new watch
  for each call was rejected, because a retry then sends a second wake. A
  request ID with a refusal of a changed repeat was rejected, because it
  adds a refusal.

## The end of the watched turn

- When the watched turn ends, its watch sends one wake (watch decision
  1 C). This holds for each end of the turn. Examples are a finished turn,
  a failure, a Stop, a stop of the cloud computer, and the time limit of
  background work.
- Each watch sends at most one wake, also when an end event repeats.
- A watch that waits holds no turn. So it keeps no cloud computer running,
  as [The stop](stop-and-resume.md#the-stop) says.
- A stop of the cloud computer ends a running turn as stopped. A turn that
  waits to run does not end then, so its watch waits for its real end.
- Archive of the watched workspace and a suspension of its owner also end
  its running turns as stopped. Their watches still send their wakes. The
  wake starts no work in the watched workspace.
- A wake tells of the end of one turn. It never says that the session or
  its task is complete. A child agent can end its turn while its own
  watches wait. A later turn can also take the messages that a turn did not
  answer. The agent reads the session, then chooses its next step.

## Delivery

- The wake follows the rules of a
  [late answer](secret-late-answers.md#late-answers) for its turn, its
  sender, and its login. It never starts a linked replacement session.
- The wake starts a turn in the calling session. That turn acts for the
  sender of the turn that set the watch, under the login rules of that
  sender. So its GitHub token, its Mac requests, and the writes of its
  workspace tools follow that member.
- When a turn of the calling session runs at the time of the wake, the
  wake joins that turn, as a message does. That turn keeps its sender.
- At delivery, the Worker checks the current access again, as for a late
  answer. When the wake can start no turn, the app sends nothing, and the
  watch ends.
- An org suspension pauses delivery. After its lift, delivery follows the
  current access checks, as [Org suspension](operator-org-suspension.md) requires.
- Examples are a closed calling session, an archived calling workspace, a
  sender who left the org, and a login that is gone. A later reopen,
  Restore, or new login does not bring the watch back.
- Reason: a wake then gives no member a right that a late answer does not
  give. A line that says that a wake was skipped was not chosen, because no
  requirement needs that state.
- A failure of the Worker, of a connection, or of a start does not lose the
  wake. The Worker tries again until the calling session accepts the wake
  or the rule above ends the watch. A retry adds no second line and no
  second turn.
- An accepted wake starts a stopped cloud computer of the calling
  workspace, as an accepted late answer does. The cases and the checks are
  the same, as [The resume](stop-and-resume.md#the-resume) says.
- The agent gets the words of the wake as a message, with its
  [sender line](message-lines.md#the-sender-line). So an older runner needs
  no update for a wake.

## The wake line

- The calling session shows the wake as one line of the app (watch
  decision 6 B). It is not a message of a member, so the chat shows no
  bubble and no sender for it.
- The line gives "A turn finished in", "A turn failed in", or "A turn
  stopped in", then the session chip of the watched session. The chip also
  names its workspace, as [Session chips](workspace-links.md#session-chips)
  says.
- When the end of the watched turn has an end reason, the line adds it
  after " · ". It uses the words of
  [What the chat shows](chat-and-events.md#what-the-chat-shows), such as
  "Background work stopped at the time limit".
- The line gives no other fact of the watched turn. It holds no error
  text, no part of an answer, no member who stopped it, and no secret
  value. The agent reads the watched session for its result.
- Reason: the line stays short, and the details stay in their session. A
  line with only the end and the chip was rejected. So were a line with
  the stored error text and a line with a part of the last answer.
- One shared text gives these words to the chat, the agent, a copy, and
  `read_session`. So the texts cannot drift apart.
- The agent, a copy, and `read_session` get the session link of the
  watched session in place of the chip, such as
  `A turn finished in https://app.conductive.build/orgs/<org ID>/workspaces/<workspace ID>/sessions/<session ID>`.
- A copy gives the line with no heading of a sender. Its link stays whole
  when the text shows as Markdown, as the link of a stop line does.
- The chat, its loaded history, and a copy show each wake once, at its
  place in the order of the events, as [Events](chat-and-events.md#events)
  says.
- A wake line starts a new part of its turn, as a message during a turn
  does. It never folds, as
  [The work of a turn](chat-and-events.md#the-work-of-a-turn) says.

## Stop

- An explicit Stop of the calling session drops the wakes of the watches
  that it set before that Stop (watch decision 5 D). This holds for each
  such wake that the session has not accepted yet. Such a wake sends no
  line.
- A wake that the session accepted before the Stop stays in its history.
  The Stop ends the turn of that wake as it ends each turn. So that wake
  starts no work and no resume after the Stop.
- An explicit Stop is Stop in the chat, `stop_session`, or a close that
  stops a turn. A `stop_session` counts also when the session has no
  running turn. A watch that the session sets after the Stop is new.
- An automatic stop ends no watch. Examples are the idle stop of the cloud
  computer, and the end of a turn when the cloud computer stops.
- A Stop of the watched session ends the watched turn as stopped. The
  watches that other sessions set on that turn then send their wakes.
- Reason: a late Allow is new input of a member, but the end of a watched
  turn needs no member. So after a Stop, a watch of earlier work starts no
  turn. Each wake passes the check of its calling session, so no watched
  workspace can miss the Stop.
- Watches that stay after a Stop were rejected, because the agent can then
  start again after Stop. A cancel in each watched workspace was rejected,
  because each Stop then needs a write in each of them. List and cancel
  calls, and a Cancel control in the chat, were rejected too. They add
  calls and screens that one watch call does not need.
- No call lists or cancels a watch. A watch has no expiry, and the app sets
  no limit on watches, as [No limit](session-calls.md#no-limit) says for
  tool messages.

## The boundary of a watch

- A watch is an explicit authorization of a running turn. Sandbox code
  can set a watch only while the calling turn runs. The Worker takes the
  sender of the watch from its own record of that turn.
- Sandbox code can never fire or change a watch. The Worker fires it once,
  at the recorded end of the watched turn, also after the calling turn
  ended.
- So sandbox code that runs between turns, such as background work, can
  set no watch and cannot wake its own session.
- Reason: [Background work](background-work.md#background-work) rejected a
  new turn that background work starts by itself, because sandbox code
  could then spend the login of the sender. A watch extends the rights of a
  running turn to one later end. It gives no right that a process can use
  again, and it adds no scheduler.
- Risk: while a turn runs, each process in its sandbox can set a watch in
  the name of that turn, as it can send a message. The wake can then start
  a new turn for the sender of that turn, also after that turn ended.

## Earlier decisions

- Decision 258 rejected a send and a read that wait for the end of a turn,
  as [Read a session](session-calls.md#read-a-session) says. A watch does
  not wait. The calling turn can end, and its cloud computer can stop. The
  Worker watches its own records of the turn.
- Decision 258 also rejected a rule that a child agent sends its result
  back. A watch needs no report from the child agent. The Worker reports a
  failure and a Stop, as well as a finished turn.
- A tool message sets no watch by itself. Reason: a watch of each message
  can make agents wake each other without end.

## Tool descriptions and guidance

- The help of the CLI, the description of `watch_session`, and the
  [agent instructions](agent-instructions.md#what-the-instructions-hold)
  say these things:
  - A watch wakes the calling session once, when the watched turn
    finishes, fails, or stops.
  - The turn ID of a reply names the exact turn to watch.
  - After the call, the agent ends its reply when only the watched work
    remains.
  - After a wake, the agent reads the watched session with `read_session`.
  - A result of `idle` or of an end sets no watch, so the agent reads the
    session at once.
  - The end of a turn does not say that the delegated task is complete.
  - An explicit Stop of the calling session drops the wakes of its earlier
    watches.
