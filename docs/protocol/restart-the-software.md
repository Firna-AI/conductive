# Restart the software

This doc holds the requirements and the decisions in force for Restart in
the workspace header, which restarts the app's own software in a running
sandbox. It also covers the automatic restart, which the Worker starts by
itself for an agent runner that stays away. It belongs to
[Life of a workspace](workspace-life.md#restart-the-software). The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A terminal
tabs decision number names a decision of the change that adds terminal
tabs to the Terminal tool, as [Terminal](terminal.md) says.

## Restart

- The state in the workspace header opens a menu with Restart, while the
  workspace is ready, working, needs input, or finished with unread output.
  On a phone the menu opens as a sheet. Cal asked for it on 16 November
  2026.
- The other states, and a read-only workspace, show the state as plain
  text. Reason: Starting already restarts, and the stopped and the error
  states keep their Resume and Try again bars.
- Restart restarts the agent runner and the preview relay in the running
  sandbox (Cal's decision 1 A of 16 November 2026). It also restarts the
  terminal service (terminal tabs decision 6 B). It does not stop or
  resume the sandbox, so it uses no start of the provider.
- The shells of the terminals and the commands in them keep running.
  Each process that an agent started under the runner ends. Each running
  turn ends, as after any restart of the runner.
- Each [service](services.md) keeps running, because it runs outside the
  unit of the runner. Restart restarts no service. A service has its own
  Restart in the Preview tool, as
  [Stop and Restart](services-in-the-app.md#stop-and-restart) says.
- An open terminal tab disconnects while the workspace shows Starting,
  and it offers Reconnect. Reconnect works again when the runner is ready.
  Previews and the activity of the workspace also pause in that time. Cal
  chose this on 16 November 2026, as option A of review item 2 of the
  Restart change.
- Terminal access during a restart was rejected for now, because it needs
  a stored restart flag and a migration. A tab that reconnects by itself
  after a Restart was rejected for the same choice. This holds only for a
  Restart: a connection that drops with no close of the server connects
  again once by itself, as [Terminal](terminal.md) says.
- A stop and resume, a one-step restart of the whole sandbox, and a
  restart of a dev server of the project were rejected. Reason: Restart
  fixes a stuck runner or relay in seconds and keeps the shells of the
  terminals.
- Before the restart, the sandbox downloads the newest release of the
  [sandbox software](sandbox-software.md#updates), with a limit of 60
  seconds (Cal's decision 2 B of 16 November 2026). The restart of the
  runner then applies it.
- When that download fails, a toast says "Couldn't check for updates." and
  the restart goes on with the installed release. Reason: a member who
  presses Restart usually wants the newest fix, and a failed download must
  not block the restart.
- The terminal service restarts after the restart of the runner applies
  the newest download. So the workspace then offers terminal tabs when the
  new terminal service opens several shells, as
  [Older software](terminal.md#older-software) says.
- Reason: Restart is the control that a member presses to apply new
  software, and the restart of the terminal service keeps every shell.
  [Older software](terminal.md#older-software) gives the options that were
  rejected.
- Every member of an org that is not suspended can restart a workspace
  whose owner is not suspended. Reason: a restart deletes no work, as for
  a resume.
- While an agent works, Restart first asks "Stop the agent and restart?".
  Cancel changes nothing.
- The note of Restart in the menu says that services keep running. The
  question says that Restart stops the turn and the commands that agents
  started, and that services and the commands in the terminals keep
  running. Reason: the member then knows that a Restart keeps each
  service.
- The header and the row show Starting from the press until the runner is
  ready again.
- When the restart fails, or the runner is not ready 3 minutes after the
  press, the workspace shows the error state with "The software didn't
  restart. Try again." Try again resumes the workspace, as after each
  failed start.
- When only the restart of the terminal service fails, the Restart still
  succeeds. The terminals stay as they were until a later Restart or
  start. Reason: the agents and the previews work again, and a failed
  download also lets the restart go on.
- The Worker refuses a restart of a workspace in another state with HTTP
  409 and the error code `workspace_not_running`. The app shows the
  refusal in a toast.

## Automatic restart

- The Worker restarts the software of a running sandbox by itself when its
  agent runner stays away while a message waits for it (Cal's decision of
  20 November 2026). This is the automatic restart.
- The runner is away from the moment that its connection to the Worker
  closes until it is ready again. That time is one away period.
- The Worker starts an automatic restart only when all of these hold:
  - A message waits for the runner in a session of the workspace.
  - The provider shows the sandbox as running.
  - The runner has been away for at least 3 minutes.
  - The oldest waiting message has waited for at least 1 minute.
  - No Restart, start, Continue, or repository change runs.
  - The state of the workspace allows a Restart, as [Restart](#restart)
    says.
  - The org and the owner of the workspace are not suspended.
- Reason: a waiting message must not wait with no end and no notice.
- A fix only in the runner, with no automatic restart, was rejected.
  Reason: it covers one cause, and a runner can also go missing in other
  ways.
- Reason for the two times: an
  [install at idle](sandbox-software.md#installs-at-idle) takes seconds,
  and the runner tries to connect again every second. So only a stuck
  runner stays away for 3 minutes.
- A running turn alone does not start an automatic restart. Reason: a
  runner that lost its connection can still run that turn, and a restart
  stops it.
- The automatic restart needs no action of a member. It does what Restart
  does:
  - The header and the row show Starting until the runner is ready again.
  - The sandbox first downloads the newest release, with a limit of 60
    seconds. When that download fails, the app shows no toast, and the
    restart goes on with the installed release.
  - The Worker then restarts the agent runner, the preview relay, and the
    terminal service. Each running turn ends, and so does each process
    that an agent started under the runner. The shells of the terminals
    and the commands in them keep running.
- Reason for the download: a newer release can hold the fix of a broken
  release.
- The automatic restart fails when the restart of the software fails, or
  when the runner is not ready 3 minutes after it began. The workspace
  then shows the error state of a failed Restart, with "The software
  didn't restart. Try again."
- The Worker starts at most one automatic restart in each away period.
  After a failed automatic restart, a member uses Try again. Reason: a
  broken release must not restart in a loop, and the error state tells
  the members.
