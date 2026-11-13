# Terminal backend

This area connects the app terminal to a private ttyd port. It also keeps
the workspace shell: one tmux session for each workspace, which outlives
each connection.
It is the only owner of the terminal software in a sandbox. That software
is ttyd, tmux, their two systemd services, the launcher, the shell server,
the password program, and the terminal bridge.
The [sandbox software](../../image/README.md) holds no terminal file.
The production Worker forwards both terminal paths to the workspace object.
Its feature handler keeps one terminal connection owner.
The browser uses the [shared terminal contract](../../src/shared/terminal.ts).

Call `createTerminalHandler(env, dependencies).fetch(request)` for both
shared terminal paths. The handler runs the app gate on each request and
each upgrade. Its default socket runtime uses Cloudflare WebSocket pairs.
Tests can inject `dependencies.sockets` at that boundary.
A socket open for a workspace whose owner is suspended gets 403
`user_suspended`. The status read still answers.

The handler opens the `/ws` path of the private ttyd port with the shared
`portRequest` of the [preview backend](../previews/README.md). That request
carries no browser cookie, header, or query. It carries the
[port credential](../sandbox/README.md#port-credentials) of the client, Basic
auth with the workspace password, and the `tty` subprotocol.

Run `terminalInstallCommand()` in the software command of each org image
build. The build runs that command detached and writes its output to the
build log. The image lifecycle owner must first authorize that org's build
sandbox. The command installs the `ttyd` and `tmux` packages with
`apt-get`. Then it writes these files:

- `/usr/local/lib/conductive/terminal`: the launcher, which runs ttyd.
- `/usr/local/lib/conductive/terminal-password`: the password program.
- `/usr/local/lib/conductive/terminal-sessions`: the shell server, which
  starts the tmux server.
- `/usr/local/lib/conductive/terminal-bridge/`: the files of the
  [terminal bridge](#the-terminal-bridge), at their paths in this
  repository. The command removes the folder first, so no file of an older
  bridge stays.
- `conductive-terminal.service`: the ttyd unit. The command enables it.
- `conductive-terminal-sessions.service`: the shell server unit.

The command puts no password in the image, and it starts nothing.
`installTerminalService(provider, sandboxId)` runs the same command for a
caller that needs a synchronous install hook. A refresh does not run the
command. So a change to these files reaches the new workspaces of an org
only after its next build. A workspace keeps the files of the image that it
started from, also after a resume. So the pull request of each change to
these files says that an existing workspace needs a new workspace to get
the change.

A workspace from an older image keeps its launcher, which runs the plain
tmux client, until the user creates a new workspace.

One quoted privileged-command helper owns the root commands.
Both units require a nonsecret enable marker under `/run`.
An image build or refresh has no marker, so it starts no terminal and no
shell, and it creates no terminal password.
Both units run as `user`. They share the runtime folder
`/run/conductive-terminal`, with mode 700.
The ttyd unit requires the shell server unit, and starts after it.

The shell server loads the workspace variables from
`/run/ascii-secrets/env.sh`, and moves to `CONDUCTIVE_REPOSITORY_DIR`, the
repository folder. Then it starts one tmux server on the socket
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
checks the password before it runs ttyd. For each connection, ttyd runs the
attach program, which runs the terminal bridge with the private Node of the
image. It removes `NODE_OPTIONS` and `NODE_PATH` of the workspace variables
first, because they could make Node load other code. The bridge attaches
to the session `workspace`, which is the workspace shell. When that session
does not exist, the bridge creates it with a login Bash shell in the
repository folder. It gives tmux the path of that folder, not its own
current folder.

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

So every connection of a workspace attaches to the same session, with its
running commands and its screen. Concurrent connections share it too. A
dropped socket ends only its own bridge and its tmux client. The tmux server runs in the
shell server unit, so a restart of the ttyd unit also keeps the session.

The session ends when its last shell exits. The next connection then
creates a new session. A stop of the sandbox ends both units and the
session. `/run` is temporary memory storage, so the next start begins with
no session.

The workspace lifecycle starts the terminal in two phases of the start,
after the workspace startup script succeeds at create and at each resume.
The workspace record must hold the sandbox ID first. Both phases end
before the workspace becomes ready, as
[Creates and resumes](../lifecycle/workspace-object.md#creates-and-resumes)
says. Do not run either phase on an image build, a refresh, or a disk
retention restart.

First, the lifecycle runs the setup command, `terminalStartCommand()`, as a
detached command, so that each alarm can check the start time limit. The
command writes the enable marker and starts the ttyd unit. systemd starts
the shell server unit first.

The synchronous `ExecStartPre` step of the ttyd unit creates a random
password locally under `/run`. It keeps an existing valid password on
service restarts. `RuntimeDirectoryPreserve=yes` in both units keeps the
runtime folder, with the password and the tmux socket, when a unit stops
or restarts. The setup command writes no password to its output or to the
command history.

The provider's file API reads only under `/home/user` or `/tmp`, and both
are on disk. So the setup command binds the memory folder
`/run/conductive-terminal` at `/home/user/.conductive-terminal`.

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

`scripts.ts` builds the exact password program, launcher, and shell server
installed in the image. Its trusted options select paths, account names,
and executables, such as ttyd and tmux. The password program captures
entropy before conversion and commits a complete password through a
temporary file. The launcher checks the password before it executes ttyd.
`terminalPromptCommand(restoreMarker)` builds the folder hook for the path
of the restore marker.

Tests execute the three programs with fake ttyd and tmux in isolated
runtime folders. The launcher tests check the attach program with a fake
Node: the bridge without the Node variables, and the fallback to the plain
tmux client. One test runs the folder hook in a real interactive Bash.
It moves the folder of the shell as a restore does, and it writes the
marker later. It checks that the shell stays in the old view until the
marker exists, moves once, keeps `OLDPWD`, and stays at a later move of
the folder. It also checks that the hook exports no variable. The install
test runs `terminalInstallCommand()` with fake `sudo`, `apt-get`, and
`systemctl` commands. It also checks that the installed bridge loads all
its modules, and that the file list holds each module that the bridge
imports. The
[restore watch tests](../lifecycle/restore-watch.test.ts) of the lifecycle
check when the Worker writes the marker. Run the tests of this area with
`npm run test -- worker/terminal`.

### The terminal bridge

The bridge sits between ttyd and tmux, one for each connection. It attaches
to the tmux session in control mode, where tmux sends the raw output of the
shell as messages and draws no screen. So the screen gets every byte that
the shell writes, and xterm.js keeps the output history itself. A plain tmux
client sends only the lines that end on its screen, so fast output never
reached the screen in full. [Terminal](../../docs/protocol/workspace-tools.md#terminal)
gives the requirements.

- **Connect.** The bridge attaches with the client flag `ignore-size`, and
  it sets the size of the window to the size of its own terminal device. It sends the screen a hello with a random nonce and the
  shared size.
- **Rebuild.** It reads the pane state with `display-message`. Then, in one
  command line, it reads the state again and captures the history and the
  screen. tmux keeps the output and the answers of a client in order, so
  the bridge drops the output until the last answer, and the output after
  it joins the captures with no gap. It never turns the output of its
  client off, because in tmux 3.4 `refresh-client -f no-output` during a
  flood of output can stall the client for good. It clears the screen, prints the history, moves it above the screen with new
  lines, and draws each row, the cursor, and the modes that tmux reports.
  When a full-screen program runs, it draws the normal screen, then the
  alternate screen. It rebuilds again when the session, the window, or the
  active pane changes.
- **Output.** It passes the `%output` of the active pane to the device.
- **Keys and pastes.** It sends keys with `send-keys -H`. A paste comes as a
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
- **Colours.** The screen's answer to the hello gives its colours. The
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

An org suspension refuses new sockets with 403 `org_suspended`.
The shared sandbox rule closes existing sockets at their next access check.
Terminal status reads remain available.

### Key Code

- [handler.ts](handler.ts) exports `createTerminalHandler`.
- [connections.ts](connections.ts) owns terminal registration, expiry, and scheduled access checks.
- [The shared connection reader](../security/connection-access.ts) reads each session, membership, and sandbox identity in one batch.
- [service.ts](service.ts) exports `terminalInstallCommand`, which installs both packages, the three programs, and both units. It also exports the image hook `installTerminalService`, the setup command `terminalStartCommand`, the password read `startWorkspaceTerminal`, the marker writer `markTerminalRestoreEnded`.
- [The shared terminal contract](../../src/shared/terminal.ts) owns `TERMINAL_PORT`.
- [scripts.ts](scripts.ts) builds the password program, the launcher, and the shell server with `credentialScript`, `launcherScript`, and `sessionServerScript`. It also holds the marker path `TERMINAL_RESTORE_MARKER`, and it builds the folder hook with `terminalPromptCommand`.
- [bridge/main.ts](bridge/main.ts) is the terminal bridge, and [bridge-files.ts](bridge-files.ts) lists its files for the install command.
- [The shared bridge messages](../../src/shared/terminal-bridge.ts) give the private messages between the bridge and the screen, and the limits.
- [credentials.ts](credentials.ts) encrypts the locally generated workspace password.
- [store.ts](store.ts) binds each cached password to its current sandbox ID and provider account.
- [privileged.ts](privileged.ts) quotes installation and service control commands.
- [protocol.ts](protocol.ts) adds server authentication to ttyd's first JSON message. It passes each later frame through unchanged.
- [scripts.test.ts](scripts.test.ts) and [install.test.ts](install.test.ts) run the programs and the install command with fakes.
- [The tools adapter](../previews/provider.ts) exposes the private port.
- [The sandbox provider](../sandbox/README.md) owns credentials, the port credential, fixed routes, and bounded file reads.
- [The workspace lifecycle](../lifecycle/README.md) runs the install command in each build. After the startup script of each create and resume, it runs the setup command and then the password read. Its restore watch calls `markTerminalRestoreEnded`.

See [terminal, previews, and desktop](../../docs/protocol/terminal-previews-and-desktop.md#terminal) and
[workspace tools](../../docs/protocol/workspace-tools.md#terminal).
