# Terminal backend

This area connects the app terminal to a private ttyd port. It also keeps
the workspace shell: one tmux session for each workspace, which outlives
each connection.
It is the only owner of the terminal software in a sandbox. That software
is ttyd, tmux, their two systemd services, the launcher, the shell server,
and the password program.
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

For an existing shell, `tmux set-option -g mouse on` enables scrolling
immediately. Run it inside that workspace's Terminal tab. The setting lasts
until the sandbox stops. A rebuilt image gives new workspaces the setting
at each start.

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
configuration file. It keeps running when no session exists, and it enables
mouse support so wheel and trackpad scrolling reach the output history.
The screen shows the default tmux status line, and Ctrl-b is the tmux prefix
key. Each new shell gets the workspace variables
from this server. The server also sets `PROMPT_COMMAND` in the global tmux
environment to the prompt hook below. The hook changes Bash's full-path
prompt escape to its folder-name escape. This keeps the prompt's colours
and other text, while showing only the current folder name.

The launcher loads the same variables, moves to the repository folder, and
checks the password before it runs ttyd. For each connection, ttyd runs a
tmux client. The client attaches to the session `workspace`, which is the
workspace shell. When that session does not exist, the client creates it
with a login Bash shell in the repository folder. The client gives tmux the
path of that folder, not its own current folder. After a start from a saved
snapshot, Boat restores the disk in the background. When the restore ends,
the current folder of the launcher can be an old view of the disk at
another path, such as `/var/lib/ascii-lazy/retired/home/code/<name>`.
The client never starts a tmux server. Without a running server, the client
exits, and ttyd closes the connection.

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
without the marker.
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

So every connection of a workspace attaches to the same session, with its
running commands and its screen. Concurrent connections share it too. A
dropped socket ends only its own tmux client. The tmux server runs in the
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

`scripts.ts` builds the exact password program, launcher, and shell server
installed in the image. Its trusted options select paths, account names,
and executables, such as ttyd and tmux. The password program captures
entropy before conversion and commits a complete password through a
temporary file. The launcher checks the password before it executes ttyd.
`terminalPromptCommand(restoreMarker)` builds the folder hook for the path
of the restore marker.

Tests execute the three programs with fake ttyd and tmux in isolated
runtime folders. One test runs the folder hook in a real interactive Bash.
It moves the folder of the shell as a restore does, and it writes the
marker later. It checks that the shell stays in the old view until the
marker exists, moves once, keeps `OLDPWD`, and stays at a later move of
the folder. It also checks that the hook exports no variable. The install
test runs `terminalInstallCommand()` with fake `sudo`, `apt-get`, and
`systemctl` commands. The
[restore watch tests](../lifecycle/restore-watch.test.ts) of the lifecycle
check when the Worker writes the marker. Run the tests of this area with
`npm run test -- worker/terminal`.

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
