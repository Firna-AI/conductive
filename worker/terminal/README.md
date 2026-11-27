# Terminal backend

This area connects the app terminal to a private ttyd port. It also keeps
the workspace shells: one tmux session for each terminal, which outlives
each connection. The workspace object owns the shared list of terminals.
This area owns the ttyd and tmux package install and the terminal script sources.
The [sandbox software](../../image/README.md) packages those scripts and their
systemd units in each release.

The production Worker forwards terminal state, list writes, and both socket routes to the workspace object.
Its feature handler keeps one terminal connection owner.
The browser uses the [shared terminal contract](../../src/shared/terminal.ts).

Call `createTerminalHandler(env, dependencies, terminals).fetch(request)` for
the shared terminal paths. The object's `WorkspaceTerminals` owner is required.
The handler runs the app gate on each request and
each upgrade. Its default socket runtime uses Cloudflare WebSocket pairs.
Tests can inject `dependencies.sockets` at that boundary.
A create, close, or socket open for a workspace whose owner is suspended gets 403
`user_suspended`. The status read still answers.

`GET terminal` includes the list, the cached `several` support value, and `eventNumber`.
The list and current workspace event number are read together in the workspace queue.
It keeps the legacy state, protocol, and socket path fields.
The new shared response fields are optional for existing response readers.
The Worker always sends them.
`POST terminal/terminals` creates an entry without starting a shell.
`DELETE terminal/terminals/<terminalId>` ends its shell and removes the entry.
Each write reply includes the event number of its committed `terminals.updated` event.
Both writes need a running workspace and a trusted app or desktop origin.
They use the same JSON request gate as the other tools.

`TerminalList` stores IDs and numbers at `terminals:list` in object storage.
An absent record reads as Terminal 1 with ID `workspace`.
Its writes and full-list `terminals.updated` events share the chat transaction.
The common workspace stream publishes only after that transaction commits.
Replayed creates with the same ID and repeated removals add no second event.
After Restart changes cached support, the same event path commits one
full-list event with `several`. An unchanged support value emits no event.
`WorkspaceTerminals` keeps closing marks in memory while provider calls wait.
It prevents concurrent closes from removing the last available terminal.
A failed close clears its mark and keeps its entry.
The list stays through Stop and resume. The existing payload purge deletes it.

`GET terminal/terminals/<terminalId>/socket` opens one listed terminal.
An invalid, absent, or closing ID gets 404 `terminal_not_found` before any
upstream connection. `GET terminal/socket` selects the first entry in number
order, including after the original Terminal 1 closes. The state response
keeps that legacy path in `socketPath`.

`WorkspaceTerminals.openSocket` checks the list and registers a socket lease
in the same queue that marks closes. A close cancels its pending and open
leases before it ends the shell. A cancelled lease stays cancelled after
the closing mark clears. The socket handler checks the lease before the
upstream call and after its upgrade returns. It closes a late upstream
socket without creating a browser connection. The lease also owns the
bridge's close callback, so a close during the last access check ends both
sides before any later browser handshake can reach ttyd.

The handler opens the `/ws` path of the private ttyd port with the shared
`portRequest` of the [preview backend](../previews/README.md). That request
carries no browser cookie, header, or query. After that request is built,
the terminal handler adds only `arg=<terminalId>` from the selected stored
entry. The fixed `workspace` ID of Terminal 1 adds no argument, including
on older software. A later terminal numbered 1 still carries its own ID.
The request carries the
[port credential](../sandbox/README.md#port-credentials) of the client, Basic
auth with the workspace password, and the `tty` subprotocol.

The software command of each org image build, refresh, and software image
build runs `terminalPackagesCommand()`. It installs `ttyd` and `tmux` with apt.
It stops and masks the package's ttyd service, which uses the terminal port.
The detached build command streams its output to the build log.
The release installer supplies both terminal units and their scripts.
It enables the ttyd unit, which requires the shell server unit.
It starts nothing and puts no password in the image.
The shell server unit sets `OOMPolicy=continue`. So an out-of-memory kill of
one command ends only that command, as
[Out of memory](../../docs/protocol/terminal-shell.md#out-of-memory) says.
The default policy, `stop`, would stop the unit and end every shell.

Release updates bring terminal script and unit changes to existing workspaces.
The program downloads them in the background. The runner applies them at a
later start, or in place when its workspace is idle. The running terminal
services keep their old scripts until their next start.
[Release installation](../../image/install.md#release-installation) says when
a changed unit applies. Restart
of the workspace software restarts ttyd after the runner applies the release.
It keeps the shell server running. But each
new terminal connection runs the bridge from `/opt/conductive/current` at
once, under the old ttyd command line. So the bridge keeps its command-line
arguments compatible across releases. A workspace without the program
receives the background bootstrap at its next normal start. Apt packages
remain part of image builds.

The system release includes the terminal bridge at
`/opt/conductive/current/system/terminal-bridge`, with its repository paths
so that its relative imports work. The private Node runs its TypeScript
files directly. A workspace that has not applied this release keeps its
plain tmux client until the software update applies.

The release also includes the executable `terminal-attach` beside `terminal`,
`terminal-password`, and `terminal-sessions` in its system folder.
The launcher embeds that attach program in ttyd's arguments at start.
A later apply or rollback can change the active release path while ttyd
keeps running. Its captured attach program stays the same.

For an existing shell, `tmux set-option -g mouse on` enables scrolling
immediately. Run it inside that workspace's Terminal tab. The setting lasts
until the sandbox stops. The release script enables it at each later terminal start.

One quoted privileged-command helper owns the root commands.
Both units require a nonsecret enable marker under `/run`.
An image build or refresh has no marker, so it starts no terminal and no
shell, and it creates no terminal password.
Both units run as `user`. They share the runtime folder
`/run/conductive-terminal`, with mode 700.
The ttyd unit requires the shell server unit, and starts after it.

The shell server loads the workspace variables from
`/run/ascii-secrets/env.sh` and reads the recorded folder variables from
`/run/conductive/repository-folders`. It moves to
`CONDUCTIVE_REPOSITORY_DIR` and starts one tmux server on the socket
`/run/conductive-terminal/tmux.sock`. The server reads no tmux
configuration file. It keeps running when no session exists. It keeps
2,000 lines of history in each pane, as the screen does. It enables mouse
support, so the wheel scrolls the history in the plain tmux client of the
fallback. The bridge gets no mouse events from tmux. Each new shell gets
the workspace variables
from this server. The server also sets `PROMPT_COMMAND` in the global tmux
environment to the prompt hook below. The hook changes Bash's full-path
prompt escape to its folder-name escape. This keeps the prompt's colours
and other text, while showing only the current folder name.

The launcher loads the same variables, moves to the repository folder, and
checks the password before it runs ttyd with `--url-arg`.
For each connection, ttyd runs the attach program with the repository path
as its first, internal argument. It then adds each URL argument.
The attach program refreshes the recorded folder variables in the shell
server for new sessions. It removes `NODE_OPTIONS` and `NODE_PATH`, because
they could make Node load other code. It then runs the terminal bridge with
the private Node of the image. With no URL argument,
the attach program selects `workspace`, the shell of Terminal 1.
One URL argument must be exactly 32 lowercase hexadecimal characters.
It selects the session `terminal-<id>`. Each other argument list exits
with code 2 before it runs the bridge or a shell.
The Worker chooses these arguments from the stored terminal list.
When the selected session does not exist, the bridge creates it with a login Bash shell in the
repository folder. It gives tmux the path of that folder, not its own
current folder.

After a [repository change](../lifecycle/repository-change.md#publication),
the ttyd and tmux services still have the start variables of the old
folder, and only a resume rewrites them. So the Worker writes the new
folder to `/run/conductive/repository`, and sets
`CONDUCTIVE_REPOSITORY_DIR` in the global tmux environment for each new
shell. `terminalFolder` in [`bridge/folder.ts`](bridge/folder.ts) reads
that file when the bridge creates the session. It takes the folder only
when it is a folder under `/home/user/code` that exists. Otherwise it
takes the folder of its command line. A session that runs keeps its
folder. The startup command deletes the file at each start, because the
start variables then name the folder of the new repository. A bridge of
an older release, and the plain tmux client, ignore the file, so a new
session there starts in the old folder until the software update.

When the private Node or the bridge is missing, or the bridge exits with
code 3 because tmux exited before the bridge attached, the attach program
runs the plain tmux client with the same session and folder. Any other exit
code of the bridge ends the connection. After a start from a saved
snapshot, Boat restores the disk in the background. When the restore ends,
the current folder of the launcher can be an old view of the disk at
another path, such as `/var/lib/ascii-lazy/retired/home/code/<name>`.
Neither the bridge nor the client starts a tmux server. Without a running
server, they exit, and ttyd closes the connection.

A shell that starts before the restore ends also stays in the old view
when the restore ends. Bash still keeps the normal path in `$PWD`.
Bash's `pwd -P` also reads that text,
so only `readlink /proc/$$/cwd` shows the real folder. The folder hook
fixes such a shell, and it moves a shell only for the restore.

Call `markTerminalRestoreEnded(provider, sandboxId)` when Boat reports the
end of the restore of a create or a resume. It writes the restore marker
`/run/conductive-terminal/restore-ended`. It runs `touch` as root, through
the privileged-command helper and the provider's `runCommand`. It throws a
provider error when the command fails or times out. The
[restore watch](../lifecycle/workspace-object.md#creates-and-resumes) of
the workspace object calls it. `/run` is memory, so each start begins
without the marker. The agent runner reads the same marker to watch the
live repository folder again, as the [runner guide](../../runner/README.md)
says. The path lives in
[`src/shared/restore-marker.ts`](../../src/shared/restore-marker.ts).
E2B boots from the saved disk and omits the optional `hydrated` field.
The common restore check then writes this marker as soon as the sandbox reports ready.
It needs no delayed repair of a retired disk view.

Bash runs the prompt hook before each prompt. Its folder check waits until
the restore marker exists. At the first prompt after that, it checks the
shell once. When the real folder of the shell is not the folder that
`$PWD` names, the hook moves the shell there with `builtin cd`, and it
keeps `OLDPWD`. So a shell in a subfolder moves to the live copy of that
subfolder, not to the repository folder. After that check, the hook never
moves that shell again. It records the check in a shell variable that it
does not export. So each new shell, also a nested one, checks for itself.
The hook has these limits:

- In a shell that waits at its prompt when the restore ends, the commands
  until its first prompt after the marker still run in the old view. The
  marker comes up to about 5 seconds after Boat reports the end of the
  restore. Each failed Boat read or marker command delays it by about 30
  seconds.
- A program that the shell started earlier, such as a dev server, keeps
  the old view.
- A startup file that replaces `PROMPT_COMMAND` turns the hook off.
- As each prompt command does, the hook resets `PIPESTATUS` before Bash
  shows the prompt. Bash keeps `$?`.

The hook also runs `history -a` at each prompt, so Bash appends each new
command to `$HISTFILE` when the command ends. Without the append, Bash
writes its history file only at exit. A workspace shell exits only at a
stop, during the shutdown. On 16 November 2026, a workspace had no history
file after such a stop and its resume, so the commands of its shell were
lost. The cause in Boat is not confirmed. Boat's file watcher logs a save
of the disk about once a minute while the sandbox runs, and the write
during the shutdown can come after the last save. The
[disk flush rules](../../docs/protocol/workspaces-and-sandboxes.md#disk-flushes)
say that a normal stop loses nothing, which this loss contradicts for
writes during the shutdown. With the append, the write comes while the
sandbox runs. An idle stop comes at least 15 minutes after the last input,
so each finished command is on the disk well before it. The append has
these limits:

- A command that still runs at the stop, such as a dev server, does not
  go in.
- An empty or unset `HISTFILE` turns the append off, as it turns off the
  write at exit. A failed append, such as to a folder that does not exist,
  prints no error.
- The append keeps the history settings of `~/.bashrc`, such as
  `HISTCONTROL` and `histappend`.
- If Boat keeps only its last save of the disk, a command that ends less
  than about a minute before a stop that does not wait for idle time, such
  as an Archive, can still be lost. This is not confirmed.

So every connection of a terminal attaches to the same session, with its
running commands and its screen. Concurrent connections share it too. A
dropped socket ends only its own bridge and its tmux client. The tmux server runs in the
shell server unit, so a restart of the ttyd unit also keeps the session.

The session ends when its last shell exits. The next connection then
creates a new session. A stop of the sandbox ends both units and the
session. `/run` is temporary memory storage, so the next start begins with
no session.

Call `closeWorkspaceTerminal(provider, sandboxId, terminalId)` to end a
terminal's session. It validates the ID before it sends one fixed command.
It runs tmux as `user` on the private socket, with an exact session target.
An absent session or server succeeds. Other failures and command timeouts
throw a provider error. Terminal 1's fixed ID selects the exact target
`=workspace`. The close route uses this helper for every terminal.

The workspace lifecycle starts the terminal in two phases of the start,
after the workspace startup script succeeds at create and at each resume.
The workspace record must hold the sandbox ID first. Both phases end
before the workspace becomes ready, as
[Creates and resumes](../lifecycle/workspace-object.md#creates-and-resumes)
says. Do not run either phase on an image build, a refresh, or a disk
retention restart.

First, the lifecycle runs the setup command, `terminalStartCommand()`, as a
detached command, so that each alarm can check the start time limit. The
command writes the enable marker and removes the old support marker before
it starts the ttyd unit. systemd starts the shell server unit first.

The command then writes `/run/conductive-terminal/several`, a nonsecret
support marker. Its content is `1` and a newline when the installed attach
program exists and the running ttyd has `--url-arg` and `terminal-attach-v1`
in its captured arguments. Its content is `0` and a newline when the
release has no attach program, or the confirmed ttyd lacks those arguments.
An unconfirmed probe leaves the support marker absent.
The command polls for ttyd before it checks these arguments.
It reads the unit's main process ID again on each of at most 50 checks,
with a 0.1-second pause between checks. It waits for `/proc/<pid>/exe`
to name the configured ttyd executable, because the launcher shell runs first.
This also handles a changed process ID after a service restart.
The poll stops at ttyd, or leaves no marker when its checks run out.
Unreadable ttyd arguments also leave no marker.
It prints no process arguments. A newly applied release alone does not prove that
the running ttyd can select a terminal.

The synchronous `ExecStartPre` step of the ttyd unit creates a random
password locally under `/run`. It keeps an existing valid password on
service restarts. `RuntimeDirectoryPreserve=yes` in both units keeps the
runtime folder, with the password and the tmux socket, when a unit stops
or restarts. The setup command writes no password to its output or to the
command history.

Boat's file API reads only under `/home/user` or `/tmp`, and both
are on disk. So the shared setup command binds the memory folder
`/run/conductive-terminal` at `/home/user/.conductive-terminal`.
E2B can read `/run` directly. It keeps the same bind mount through the shared setup hook.

After the setup command exits with code 0, the lifecycle calls
`startWorkspaceTerminal(env, orgId, workspaceId, dependencies)`. This
function starts nothing. It reads the password through the bind mount,
with the provider's bounded file API and a 64-byte limit. The password
stays in memory, and the disk holds only the empty mount point.

The function refuses a password that is not exactly 64 lowercase
hexadecimal characters. It caches that password encrypted in D1. The cache
update checks that the workspace still owns the same sandbox.
It also checks the provider account. A read returns the password only for
that sandbox ID and account.

The same start read also gets the support marker with a two-byte limit.
Only the exact content `1` and a newline means several terminals.
A missing file, odd content, or read failure means one terminal and does
not fail the password read. D1 stores the result as `terminal_credentials.several`
beside the encrypted password. Existing rows default to `0`.
`terminalSeveral` reads it for the current sandbox and provider account.

Restart shares the start probe and the bounded file reader. It removes
the old support marker before it restarts only `conductive-terminal.service`.
A failed service restart or probe prints a warning and leaves no marker,
without failing Restart. A release with no attach program writes `0`.
The workspace object then refreshes the encrypted password and support for
the sandbox ID and provider account captured before Restart. A failed
read, including a missing support marker, warns and keeps the cached values.
It emits no terminal list event. The cache comparison and update
run in the workspace queue with the terminal list event. That event lets
an open app learn new support even if the runner became ready first.

The app supplies no extra terminal secret at start. The workspace token
keeps its existing scope and does not authenticate terminal access.
`/run` must stay temporary memory storage in the org image.

The handler reports no activity for any terminal frame.
xterm.js sends its automatic replies, such as a cursor report, in the same input frames as the keys of the user.
A reply can have the same bytes as a key, so the server cannot tell them apart.
The input listener of the app page counts the user's input in the terminal instead, as [Input activity](../lifecycle/routes.md#input-activity) says.

`TerminalConnections` owns each authenticated session and workspace/sandbox
registration. Each registration holds a `sandbox` identity of the
[shared connection reader](../security/README.md#open-connections).
That kind binds the grant to the current sandbox ID and provider account of a running workspace that is not archived.
The owner of that workspace must not be suspended, as [Sandbox access](../operator/README.md#sandbox-access) says.
So an open socket closes at the next access check after that suspension.
Chat tabs use the `workspace` kind, which has no sandbox check.
`add` reads the first grant before the handler connects to the ttyd port.
The shared reader sets the deadline of each grant.

One query checks its live registrations every 15 seconds.
An independent deadline cancels idle connections if an access read stalls.
Frame checks use only the live registration. They run no D1 access query.
Cleanup removes the registration and its scheduled work.
Inject `dependencies.terminalSchedule` and `now` to test these deadlines.

Each terminal socket is a bridge. `bridgeSocket` joins the browser socket to an outbound socket to the ttyd port.
Such a bridge keeps its workspace object active, also while it is idle, as [Work that keeps the object active](../README.md#work-that-keeps-the-object-active) says.
So the access timers of the terminal stay in memory.

`scripts.ts` builds the exact password program, attach program, launcher,
and shell server installed in the image. Its trusted options select paths, account names,
and executables, such as ttyd and tmux. The password program captures
entropy before conversion and commits a complete password through a
temporary file. The launcher checks the password before it executes ttyd.
`terminalPromptCommand(restoreMarker)` builds the prompt hook, with the
folder check for the path of the restore marker and the history append.

Tests execute the programs with fake ttyd and tmux in isolated
runtime folders. The launcher tests check the attach program with a fake
Node: the bridge without the Node variables, and the fallback to the plain
tmux client. They reject invalid, empty, and multiple terminal IDs before either path.
The start tests inspect controlled process records for the support marker.
They check a delayed ttyd start and a launcher that stays through the poll limit.
Their fake sleep command records the poll pauses without a real delay.
The service tests check bounded marker reads and the cached sandbox identity.
The close tests check exact targets, absent sessions, failures, and timeouts.
One test runs the folder hook in a real interactive Bash.
It moves the folder of the shell as a restore does, and it writes the
marker later. It checks that the shell stays in the old view until the
marker exists, moves once, keeps `OLDPWD`, and stays at a later move of
the folder. It also checks that the hook exports no variable. Two more
tests run the hook with a history file. They check that each command is in
the file before the shell exits, also when the shell is killed, and that
the hook keeps `$?`. They also check that an empty `HISTFILE` writes
nothing and that a failed append prints no error. A third test unsets
`HISTFILE` in the shell. Without `HISTFILE`, `history -a` appends to the
readline file `~/.history` when that file exists, so the hook must check
`HISTFILE` first. The test checks that `~/.history` stays empty. The package
test runs `terminalPackagesCommand()` with fake `sudo`, `apt-get`, and
`systemctl` commands. The unit tests read the release units and system installer.
The bridge release test packages and extracts the system archive. It checks
that each bridge module matches its source and that Node can load it.
Another test checks that the file list includes every imported module.
The lifecycle tests check that the package service is masked before release activation.
The [restore watch tests](../lifecycle/restore-watch.test.ts) of the lifecycle
check when the Worker writes the marker. Run the tests of this area with
`npm run test -- worker/terminal`.

### The terminal bridge

The bridge sits between ttyd and tmux, one for each connection. It attaches
to the tmux session in control mode, where tmux sends the raw output of the
shell as messages and draws no screen. So the screen gets every byte that
the shell writes, and xterm.js keeps the output history itself. A plain tmux
client sends only the lines that end on its screen, so fast output never
reached the screen in full. [The screen](../../docs/protocol/terminal.md#the-screen)
gives the requirements.

- **Connect.** The bridge attaches with the client flag `ignore-size`, and
  it sets the size of the window to the size of its own terminal device. It sends the screen a hello with a random nonce and the
  shared size.
- **Rebuild.** In one command line, it reads the pane state with
  `display-message` and captures the pane: the history with the screen,
  the history alone, the screen, and the normal screen behind a full-screen
  program. `-q` keeps the last capture from failing when no such program
  runs, because a failed command ends its line. tmux keeps the output and
  the answers of a client in order, so the bridge drops the output until
  the last answer, and the output after it joins the captures with no gap.
  It never turns the output of its client off, because in tmux 3.4
  `refresh-client -f no-output` during a flood of output can stall the
  client for good. It clears the screen, turns autowrap on, and selects
  ASCII as G0 and line drawing as G1, which `tmux-256color` programs
  expect. Then it prints the captured lines as a flow. tmux joined each
  line that it wrapped (`-J`), so xterm.js wraps it again at the same
  width, the history scrolls above the screen, and a long line stays one
  line for a copy. Each line ends with SI, so no line-drawing run stays
  open. When a full-screen program runs, it prints the normal screen,
  moves to the cursor that the program saved, switches to the alternate
  screen, and prints the program's screen. Last, it sets the cursor and
  the modes that tmux reports, with origin mode and the scroll region. It
  rebuilds again when the session, the window, or the active pane
  changes.
- **Output.** It passes the `%output` of the active pane to the device.
  After a `%layout-change`, a program redraws for the new size at once. So
  the bridge holds the output until its read of the new size answers,
  sends the size, and then sends the held output.
- **Keys, mouse reports, and pastes.** It sends keys with `send-keys -H`.
  Each mouse report comes as a message, also one in a binary encoding,
  which the transport cannot carry as text. The bridge sends its bytes as
  keys, but a mouse report does not take the shared size. A paste comes as a
  message. The bridge writes it to a private file in the runtime folder and
  pastes it with `paste-buffer -p`, so tmux adds the bracketed paste marks
  when the program asked for them. tmux 3.4 does not report that mode, so a
  rebuilt screen cannot know it.
- **Size.** All viewers share the size of the window. A connect, a resize,
  and the first key or paste after another viewer took the size set it with
  `resize-window`. The global `window-size manual` option is not used,
  because tmux 3.4 then stops at the next `new-session`. On each
  `%layout-change`, the bridge sends the new size to the screen. It keeps
  the size at most 500 columns and 200 rows, and takes its own size again
  when a program sets a larger one.
- **Colours.** The screen's answer to the hello gives its colours, and the
  screen sends them again after each change of the colour scheme. The
  bridge sets them as the `window-style` of the window, so tmux answers a
  colour query of a program with them.
- **Flow control.** After the screen answers the hello, the bridge writes a
  mark after each 64 KB of output, and the screen acknowledges the marks
  that it parsed. When 16 marks wait, the bridge drops the output. When the
  screen acknowledged every mark, it rebuilds the screen. It never stops reading tmux, because a tmux client
  that cannot write its output stalls.
- **Messages.** Both directions use one private OSC with the nonce, from
  the shared bridge messages. The bridge takes the screen's messages out of
  the input, so they never reach the shell. It drops a message with
  another nonce.

The private Node 24 runs the TypeScript files of the bridge directly, with
its type stripping. So they use erasable syntax only, import only `node:`
modules and each other, and keep their repository paths in the image.
`tsconfig.worker.json` leaves them out, and the test check with Node types
checks them.

The tests in `bridge/` run the bridge against a real tmux in a terminal
device of Python's `pty` module, and replay its output in
`@xterm/headless`. They are skipped when the machine has no tmux, except in
CI, which installs tmux. Run them with `npm run test -- worker/terminal/bridge`.

An org suspension refuses creates, closes, and new sockets with 403 `org_suspended`.
The shared sandbox rule closes existing sockets at their next access check.
Terminal status reads remain available.

### Key Code

- [handler.ts](handler.ts) exports `createTerminalHandler`.
- [request.ts](request.ts) checks terminal paths through the app request gate.
- [socket.ts](socket.ts) opens the selected terminal with trusted ttyd arguments and keeps the sandbox connection checks.
- [socket-lease.ts](socket-lease.ts) cancels a pending or open terminal socket when its close starts.
- [mutations.ts](mutations.ts) applies running and support checks to terminal writes.
- [workspace.ts](workspace.ts) owns list snapshots with event numbers, closing marks, and socket leases beside the chat queue.
- [list-store.ts](list-store.ts) stores the list and emits its events through [chat/store.ts](../chat/store.ts).
- [connections.ts](connections.ts) owns terminal registration, expiry, and scheduled access checks.
- [The shared connection reader](../security/connection-access.ts) reads each session, membership, and sandbox identity in one batch.
- [service.ts](service.ts) exports `terminalPackagesCommand`, which installs the apt packages without replacing release files. It also exports the setup command `terminalStartCommand`, the password and support read `startWorkspaceTerminal`, and the marker writer `markTerminalRestoreEnded`.
- [support.ts](support.ts) shares the bounded support probe between start and Restart, and builds the terminal-only restart command.
- [service-files.ts](service-files.ts) reads and validates the bounded password and support files.
- [refresh.ts](refresh.ts) refreshes the cache after Restart and publishes changed support through the list owner.
- [close.ts](close.ts) exports `closeWorkspaceTerminal`, which ends one terminal's session.
- [The shared terminal contract](../../src/shared/terminal.ts) owns `TERMINAL_PORT`, `FIRST_TERMINAL_ID`, `TERMINAL_LIMIT`, `TERMINAL_ID_PATTERN`, and `isTerminalId`.
- [scripts.ts](scripts.ts) builds the password program, attach program, launcher, and shell server with `credentialScript`, `attachScript`, `launcherScript`, and `sessionServerScript`. It also owns the terminal paths and attach program name, and builds the prompt hook with `terminalPromptCommand`.
- [bridge/main.ts](bridge/main.ts) is the terminal bridge, and [bridge-files.ts](bridge-files.ts) lists its files for the system release packager.
- [The shared bridge messages](../../src/shared/terminal-bridge.ts) give the private messages between the bridge and the screen, and the limits.
- [credentials.ts](credentials.ts) encrypts the locally generated workspace password and exports `terminalPassword` and `terminalSeveral`.
- [store.ts](store.ts) binds each cached password and support value to its current sandbox ID and provider account.
- [privileged.ts](privileged.ts) quotes installation and service control commands.
- [protocol.ts](protocol.ts) adds server authentication to ttyd's first JSON message. It passes each later frame through unchanged.
- [scripts.test.ts](scripts.test.ts) and [install.test.ts](install.test.ts) run the scripts and package command with fakes. They also read the release units.
- [The tools adapter](../previews/provider.ts) exposes the private port.
- [The sandbox provider](../sandbox/README.md) owns credentials, the port credential, fixed routes, and bounded file reads.
- [The workspace lifecycle](../lifecycle/README.md) runs the package command in each build. After the startup script of each create and resume, it runs the setup command and then the password read. Its restore watch calls `markTerminalRestoreEnded`.

See [terminal, previews, and desktop](../../docs/protocol/terminal-previews-and-desktop.md#terminal) and
[terminal](../../docs/protocol/terminal.md).
