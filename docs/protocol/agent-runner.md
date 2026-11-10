# Agent runner

This doc holds the requirements and the decisions in force for the agent
runner, our program in each sandbox. It covers the connection of the
runner, its events and their limits, its turns, its report of the
listening ports, and the repair of lost workspace updates. It belongs to
[Chat and events](chat-and-events.md), which covers the agents, the
sessions, what the chat shows, and the events. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The agent runner

- The runner starts with the sandbox, and starts again after each resume.
- The runner opens one outbound WebSocket to the Durable Object of its
  workspace, at `/v1/runner` on `api.conductive.build`, the hostname for
  machines. It proves itself with the workspace token.
- The runner connection carries a protocol version. The Durable Object
  serves each version that a live org image or sandbox can hold.
- Each build of the org image installs the newest runner. Reason: a stopped
  sandbox can resume weeks later with an old runner.
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
- The runner keeps the longest detail prefix that fits that limit.
  It replaces lone UTF-16 surrogates with U+FFFD before it counts or truncates text.
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
  each interrupt, and each change of the model or the effort to the runner.
- Each turn also brings the agent login of the starter of its session, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says.
- Each turn that the runner accepts gets exactly one end: `turn.completed`
  or `turn.failed`. This holds also when Stop, a shutdown, or a crash of
  the runner comes before the agent starts.
- The runner keeps a record of each accepted turn across a crash and a
  restart, until the workspace confirms the end of the turn. The workspace
  sends no turn or message command for a turn after it stores the end of
  that turn.
- After a failed file copy ends a running turn, the workspace can still
  send Stop for that turn, to cancel the agent. That turn still shows as
  failed. Reason: the failure in [Attachments](messages-and-attachments.md#attachments) ends the turn
  at once, with no new wait for the agent.
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
  and reads files and diffs on request, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
  File results are not part of the chat history.

## Listening ports

- The runner reports the TCP ports that listen in its sandbox, for the
  [port previews](workspace-tools.md#port-previews) (decision 218). Each
  `ports.updated` event holds the full list.
- The list holds each port in the listen state on a wildcard or a loopback
  address, owned by the user of the runner. Reason: a specific address
  belongs to Boat's relay, and other users own system services, such as
  SSH.
- Cost: a port that a root process opens, such as a Docker port, does not
  show. The port field still opens it.
- The list leaves out the terminal port. It also leaves out each other
  port of the app's own services that a new sandbox shows.
- A port joins the list after two scans in a row find it, and it leaves
  after two scans in a row miss it. The runner scans every 2 seconds.
- Reason: a short test server of an agent does not change the list. A
  server that restarts after each edit, such as under `nodemon`, keeps its
  row, so the rows below it do not move.
- Each port has a name or none, and a folder or none (decision 219). They
  stay the same for the life of the socket of the port. A port whose
  process the runner cannot read has no name.
- The name is the file name of the program. For a known interpreter, such
  as `node`, `python3`, `bun`, or `deno`, it is the file name of the
  script, or the module after `-m`.
- The next word joins the name only when it has 1 to 20 lowercase letters
  and hyphens, such as `dev` or `serve`. Reason: a next word can hold a
  secret, so a token with digits or capitals stays in the sandbox.
- Risk: a password of lowercase letters alone can still pass. The output
  filter hides it only when it is a marked env value.
- The folder comes from the working folder of the process, as
  [Folder names](repository-folders.md#folder-names) places the
  repositories:
  - In the root of the workspace's own repository, the port has no folder.
  - Below that root, the folder is the path from the root, such as
    `apps/web`.
  - In another repository folder under `~/code`, the folder is the name of
    that folder and the path below it, such as `api` or `api/server`.
  - Outside these folders, the port has no folder. Reason: no path outside
    the repositories reaches the browser.
- A report holds at most 64 ports, in the order of their numbers.
- The private runner report keeps each selected label complete until the
  workspace filters secret values. No display cut precedes that filter.
- Each private report meets the runner envelope byte limit. When complete
  optional labels cannot fit the private budget, they become unavailable
  as whole labels. Their ports stay in the report. A private cut was
  rejected, because a longer secret can cross that cut too.
- The workspace stores and sends names of at most 40 characters and
  folders of at most 120 characters, after the secret filter. A longer
  folder keeps its end, after "…", because the end tells servers apart.
- Reason: stored and displayed reports stay small, and rows do not move
  under the pointer. Complete filter input prevents app-created secret
  fragments.
- The runner sends the list when it changes, and once after each connect,
  also when it is empty. It also answers a `report.refresh` of the kind
  `ports.updated`, as [Lost workspace updates](#lost-workspace-updates)
  says.
- The runner protocol stays at version 1. Reason: only a runner that
  reports ports sends `ports.updated`, and only after a refused report of
  that kind does the workspace ask for its refresh.
- A port report is not activity under the rule of
  [Stop and resume](workspaces-and-sandboxes.md#stop-and-resume)
  (decision 29). So it does not delay the stop of a sandbox.

## Lost workspace updates

- The file tree, the changes list, the start steps, the workspace name,
  and the list of listening ports belong to no session. A later full
  report of the same kind replaces each of them. But a report of the workspace name sets that name only while
  the workspace has no name, as
  [Workspace and session names](agents-and-sessions.md#workspace-and-session-names) says.
- When the workspace refuses an update of one of these kinds, the update is
  lost. The workspace stores its marker. Then it asks the runner once for a
  fresh full report of that kind (decision 96).
- The browser shows nothing for that marker. A notice shows beside the
  affected data only when the repair fails. A newer complete report of that
  kind clears the notice.
- Reason: only the latest full report matters. A notice for each lost update
  was rejected.
- The request is a `report.refresh` command with a `commandId` and a `kind`.
  The kind is `files.snapshot`, `changes.updated`, `start.updated`,
  `workspace.title`, or `ports.updated`.
- The workspace asks for a full file tree after a refused tree delta. It asks
  for no report after a refused event of any other type.
- Each kind has at most one open request. After a further refusal of that
  kind, the workspace sends no second request.
- A stored complete report of that kind ends the repair, also a failed one.
  A report of the workspace name that comes when the workspace already has
  a name also ends the repair, because it can change nothing. It ends no
  repair of another kind. After the next refusal of that kind, the
  workspace asks for a new report, with a new command ID.
- A replacement is a later full report of the same kind.
  [Files and changes](workspace-tools.md#files-and-changes) says
  which file reports count as replacements.
- The repair fails when the workspace refuses a replacement too, for any
  reason. Only the marker of such a replacement carries `repairFailed: true`.
- Each new connection gets the open request again, with the same command ID.
  A repeated command ID is the same request, not a new one.
- After a failed repair, no new connection gets the request again.
- The workspace stores the marker and the open request together. A storage
  failure stores neither, and the update stays unconfirmed.
- When a refusal makes a new request, the workspace confirms the refused
  update only after the request goes out. Until then, no confirm and no
  welcome covers that update.
- The workspace sends a request after the `welcome`, also before
  `runner.ready` and during a running turn. A request needs no agent login.
- The runner answers each request with a full report of its kind, also
  during a running turn. When it cannot read the repository, it answers a
  request for a file tree or a changes list with `files.unavailable`, as
  [Files and changes](workspace-tools.md#files-and-changes) says.
