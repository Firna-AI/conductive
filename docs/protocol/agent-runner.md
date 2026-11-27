# Agent runner

This doc holds the requirements and the decisions in force for the agent
runner, our program in each sandbox. It covers the connection of the
runner, its events and their limits, its turns, what an out-of-memory kill
ends, the background work of Claude turns, its reports of the listening
ports and of the skills, its reads of one skill, the repair of lost
workspace updates, and the warnings of the Worker about the runner. It
belongs to
[Chat and events](chat-and-events.md), which covers the agents, the
sessions, what the chat shows, and the events. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A gateway decision number names a decision of the change that adds
the [model gateway](model-gateway.md), as that doc says. A background work
decision number, such as background work decision 1, names a decision of
the change that keeps a turn open for background work.
[Services](services.md) gives the named programs that run outside every
turn, in units of their own.

## The agent runner

- The runner starts with the sandbox, and starts again after each resume.
- The runner opens one outbound WebSocket to the Durable Object of its
  workspace, at `/v1/runner` on `api.conductive.build`, the hostname for
  machines. It proves itself with the workspace token.
- The runner connection carries a protocol version.
  [Runner versions](version-pins.md#runner-versions) states which version
  a workspace accepts, and what a refused runner and its turns get.
  [The version pin](version-pins.md#the-version-pin) states the lowest
  version that each workspace accepts.
- Each hello of the runner also carries the process-start ID of its
  runner start, for the warnings of the Worker, as
  [Process starts](runner-warnings.md#process-starts) says.
- Each hello of a runner whose
  [file server](file-server.md) listens also carries
  `fileServer: true`. Any other hello announces no file server, also the
  hello of an older runner, which sends no such field. A `fileServer`
  value of another type does not refuse the hello.
- The field needs no new protocol version, so the runner protocol version
  stays 2. Reason: the hello already announces the login kinds that the
  runner supports.
- Each hello of a runner that gives
  [change notes](capabilities-agents.md#where-the-note-goes) to its agents
  also carries `capabilityNotices: true`. Any other hello announces no
  change notes, also the hello of an older runner. A value of another type
  does not refuse the hello. This field needs no new protocol version
  either.
- The Worker sends change notes only to a runner that announces them.
- Each hello of a runner that answers `skill.read` also carries
  `skillReads: true`, as [Skill reads](skill-tabs.md#skill-reads) says.
  Any other hello announces no skill reads, also the hello of an older
  runner. A value of another type does not refuse the hello. This field
  needs no new protocol version either.
- A hello and a welcome can also agree on changes deltas, each with
  `changesDeltas: true`, as [The agreement](changes-deltas.md#the-agreement)
  says. This field needs no new protocol version either.
- Each build of the org image installs the newest runner. Each sandbox then
  updates its runner itself, at a later start or when its workspace is
  idle, as [Updates](sandbox-software.md#updates) says. Reason: a fix of
  the runner then reaches each sandbox with no new workspace.
- A sandbox runs its older runner until its update applies. A stopped
  sandbox can also resume weeks later with an old runner.
- A connection to the runner through a Boat port address was rejected,
  because it ties the runner to Boat.
- The runner numbers each event, and keeps it until the Durable Object
  confirms it.
- A dropped connection loses no event. A resent event shows once.
- A complete numbered runner event envelope holds at most 1 MiB, or
  1,048,576 bytes, of compact UTF-8 JSON (decision 76).
- The limit measures `JSON.stringify` of the complete runner event envelope.
  It includes the stream ID, event number, timestamp, payload, escapes, and delimiters.
- The limit excludes WebSocket framing and the workspace storage wrapper.
  Reason: the remaining storage value budget holds that wrapper.
- Each tool detail holds at most 64 KiB, or 65,536 bytes, of serialized UTF-8 JSON.
  The count includes its surrounding quotes and JSON escapes.
- The longest detail prefix that fits that limit stays.
  Lone UTF-16 surrogates become U+FFFD before the count and the cut.
- A runner that supports complete tool details says so in its `hello`.
  When the `welcome` of the workspace accepts them, the runner sends the
  complete source of each detail, with no cut.
- Otherwise the runner keeps the prefix before it sends the event, as an
  older runner does.
  [Tool detail secrets](tool-detail-secrets.md#older-runners-and-fallback-connections)
  gives the risk of that cut.
- With complete tool details, the Durable Object hides each exact copy of a
  secret value in the complete source before it keeps the prefix, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  and [The exact-copy filter](secret-requests.md#the-exact-copy-filter) say.
  So its cut never splits such a copy.
- Reason: a cut before that filter can leave the start of a secret value,
  and the filter cannot match a part of a value.
- When the runner sends a complete source in private parts, each part fits
  the envelope limit above.
- A dropped connection, or a restart of the runner or of the Durable Object,
  loses no part. A resent part changes nothing.
- A failed save in the runner never loses only some parts of a source.
- No part reaches a browser or the stored chat. The tool update shows once,
  after its last part.
- A refused part follows the refusal rules below, but its marker names
  `tool.updated` as its event type. No text of its source shows.
- Reason: an older copy of the app cannot read a marker with an unknown type.
- A prefix never splits a Unicode code point.
  The omitted detail count measures source UTF-8 bytes before JSON escaping.
- The count applies to the complete source detail of that tool update.
  It does not add the counts of previous updates.
- A null detail stays null and has an omitted count of zero.
  A complete detail also has an omitted count of zero.
- A detail has no inserted omission notice. Its count carries that information.
- An end-of-turn file list keeps a prefix of at most 200 unique-path entries.
  Its serialized UTF-8 JSON array also holds at most 256 KiB, or 262,144 bytes.
- That byte count includes brackets, commas, and escapes.
  Each entry stays whole. The omitted file count equals the full count minus the kept count.
- Both omission counts are non-negative safe integers.
  Reason: bounded excerpts keep tool output and turn summaries within the event budget.
- A `turn.completed` event carries `filesUnavailable: true` when the runner
  cannot tell which files the turn changed (decision 109). Examples are a
  failed read of the repository, and a restart that ends a started turn.
- With the mark, `files` is empty and `omittedFileCount` is 0. These values
  then mean an unknown list. Without the mark, the same values mean that
  the turn changed no files.
- The mark never changes the state of the end, `finished` or `stopped`.
- A `turn.completed` event of a turn with fast mode on carries its speed
  when known, with the cause of a standard speed, as
  [The speed of a turn](fast-mode.md#the-speed-of-a-turn) says. The speed
  never changes the state of the end either.
- A permanent refusal has one of three reasons: too large, invalid, or turn not active.
  The workspace stores one small refusal marker before it confirms that runner event.
- The marker names the runner stream, runner event number, event type, and reason.
  An invalid discriminator uses `unknown` as its type.
- A marker includes verified session and turn IDs, or null when no verified context exists.
  It never copies the refused payload.
- The marker belongs only to workspace chat events. The runner cannot send it.
- A confirmed marker advances the runner cursor and removes that event from its outbox.
  A duplicate produces no second marker and no second chat line.
- Reason: one bad event must not stop all later events (decision 76).
- A refused end-of-turn event still ends its active turn.
  The marker shows that the terminal data was lost.
- Turn not active means that the event names a turn that never started (decision 104).
  The workspace stores each valid late event of a turn that started and has ended, in that turn.
- A late event never reopens its turn or changes its end.
  The active turn of its session stays the same.
- The chat shows that turn as ended. A tool that was running in it shows as stopped.
- Reason: after a resume, the runner sends the unconfirmed events of an ended turn again.
  A refusal of these events was rejected, because it lost real agent text.
- A storage or network failure closes the connection without a confirmation.
  It remains retryable. It never becomes a permanent refusal.
- The Durable Object forwards each message, each message during a turn,
  each interrupt, and each change of the model, the effort, or the fast
  mode to the runner.
- Each turn also brings a turn token for the login of its session, as
  [The turn token](model-gateway.md#the-turn-token) says.
  No command carries the agent login itself, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- A turn on a Claude own endpoint login also asks the runner for a prompt
  cache of 1 hour, as
  [How the agents reach the gateway](model-gateway.md#how-the-agents-reach-the-gateway)
  says. A runner that does not support this request ignores it. Claude
  then asks for the default cache of about 5 minutes.
- Each turn also asks the runner for the fast mode of its choice. A runner
  that does not support fast mode ignores it, and the turn runs at standard
  speed, as [Fast mode](fast-mode.md#the-requests-of-the-agents) says.
- Each turn also brings the capabilities of its session, for the agent
  instructions of a new session, as
  [The capabilities](agent-instructions-changes.md#the-capabilities) says.
- Each turn that the runner accepts gets exactly one end: `turn.completed`
  or `turn.failed`. This holds also when Stop, a shutdown, or a crash of
  the runner comes before the agent starts.
- The runner keeps a record of each accepted turn across a crash and a
  restart, until the workspace confirms the end of the turn. The workspace
  sends no turn or message command for a turn after it stores the end of
  that turn.
- After a failed file transfer or file check ends a running turn, the
  workspace can still send Stop for that turn, to cancel the agent. That
  turn still shows as failed. Reason: the failure in
  [The transfer](attachment-transfers.md#the-transfer) ends the turn at
  once, with no new wait for the agent.
- At a shutdown, the runner sends a stopped end for each accepted turn that
  has no end. After a restart, it does the same for each turn that it
  accepted before the restart. It starts no agent for such a turn.
- A resent turn command or Stop that finds the record of its turn starts
  nothing and sends no second end.
- A Stop of a turn that the runner does not know gets one stopped end. The
  runner keeps a record of that turn too.
- Reason: work that Stop or a shutdown ended must not run later. A list of
  waiting turns only in memory was rejected, because a crash loses it, and
  the resent turn then runs.
- When a read of the repository or a save by the runner fails during a
  step, the runner still ends that step (decision 109):
  - A turn that cannot start ends with `turn.failed` and its cause.
  - A turn whose changed files the runner cannot read ends with
    `filesUnavailable: true`.
  - After a connect, a failed scan of the repository does not stop
    `runner.ready`. The runner sends `files.unavailable` first, as
    [Files and changes](workspace-tools.md#files-and-changes)
    says. It then accepts commands.
- Reason: one failed read must not leave a turn running with no agent, or
  the chat in its starting state. An exit of the runner after such a
  failure was rejected, because it loses each running turn, and a lasting
  failure repeats the exit.
- The runner also reports the file tree and the changes of its workspace,
  within the limits that [File reports](file-reports.md#report-limits)
  states, and reads files and diffs on request, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
  File results are not part of the chat history.

## Out of memory

[Out of memory](out-of-memory.md) states what an out-of-memory kill in
the sandbox ends, and its risks.

## Background work

[Background work](background-work.md#background-work) states when a Claude
turn stays open for background work, and when it ends.

### The note

[The note](background-work.md#the-note) states the note that the agent
gets about its live work.

### The time limit

[The time limit](background-work.md#the-time-limit) states the limit of
the wait of a turn, and its end at the limit.

## Listening ports

The [listening-port requirements](listening-ports.md) give the scanner,
its labels, its limits, and its full reports.

## Skills report

[The skills report](skill-mentions.md#the-skills-report) gives the skill
folders of each agent, the limits of the report, the filter of
credentials, and when the runner sends the report.

## Skill reads

[Skill reads](skill-tabs.md#skill-reads) gives the `skill.read` command
that reads the text of one skill for a skill tab, its result
`skill.read.result`, and its errors.

## Lost workspace updates

The [lost-update requirements](lost-workspace-updates.md) give the reports
that belong to no session, the repair request after a refused update, and
the notice of a failed repair.

## Runner warnings

The [runner warning requirements](runner-warnings.md) give the warnings of
the Worker for each runner connection, for its end, and for each turn end
with no Stop request. They also give the process-start ID that the runner
sends for these warnings.
