# Terminal backend

This area connects the app terminal to a private ttyd port. It also keeps
the workspace shell: one tmux session for each workspace, which outlives
each connection.
It is the only owner of the terminal software in a sandbox. That software
is ttyd, tmux, their two systemd services, the launcher, the shell server,
and the password program.
The [sandbox software](../../image/README.md) holds no terminal file.
The production Worker forwards both terminal paths to the workspace object.
Its feature handler keeps one terminal connection owner and reports input activity to the lifecycle.
The browser uses the [shared terminal contract](../../src/shared/terminal.ts).

Call `createTerminalHandler(env, dependencies).fetch(request)` for both
shared terminal paths. The handler runs the app gate on each request and
each upgrade. Its default socket runtime uses Cloudflare WebSocket pairs.
Tests can inject `dependencies.sockets` at that boundary.
A socket open for a workspace whose owner is suspended gets 403
`user_suspended`. The status read still answers.

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
started from.

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
configuration file. It changes one default option: it keeps running when
no session exists. So the screen shows the default tmux status line, and
Ctrl-b is the tmux prefix key. Each new shell gets the workspace variables
from this server.

The launcher loads the same variables, moves to the repository folder, and
checks the password before it runs ttyd. For each connection, ttyd runs a
tmux client. The client attaches to the session `workspace`, which is the
workspace shell. When that session does not exist, the client creates it
with a login Bash shell in the repository folder. The client never starts
a tmux server. Without a running server, the client exits, and ttyd closes
the connection.

So every connection of a workspace attaches to the same session, with its
running commands and its screen. Concurrent connections share it too. A
dropped socket ends only its own tmux client. The tmux server runs in the
shell server unit, so a restart of the ttyd unit also keeps the session.

The session ends when its last shell exits. The next connection then
creates a new session. A stop of the sandbox ends both units and the
session. `/run` is temporary memory storage, so the next start begins with
no session.

Call `startWorkspaceTerminal(env, orgId, workspaceId, dependencies)` after
the workspace startup script succeeds. The lifecycle owner must store the
sandbox ID first. Call the hook at create and each resume, before the owner
marks the workspace ready. Do not run this start hook on an image build, a
refresh, or a disk retention restart.

The hook writes the enable marker and starts the ttyd unit. systemd starts
the shell server unit first. The synchronous `ExecStartPre` step of the
ttyd unit creates a random password locally under `/run`. It keeps an
existing valid password on service restarts. `RuntimeDirectoryPreserve=yes`
in both units keeps the runtime folder, with the password and the tmux
socket, when a unit stops or restarts. The readiness command returns no
password in stdout or command history.

The provider's file API reads only under `/home/user` or `/tmp`, and both
are on disk. So the hook binds the memory folder `/run/conductive-terminal`
at `/home/user/.conductive-terminal`, and it reads the password there
through the provider's bounded file API, with a 64-byte limit. The password
stays in memory, and the disk holds only the empty mount point. It refuses a password that is not
exactly 64 lowercase hexadecimal characters. It caches that password
encrypted in D1. The cache update checks that the workspace still owns the
same sandbox.

The app supplies no extra terminal secret at start. The workspace token
keeps its existing scope and does not authenticate terminal access.
`/run` must stay temporary memory storage in the org image.

Set `dependencies.onActivity` to report each input to the input owner of the workspace, as [Input activity](../lifecycle/README.md#input-activity) says.
That call returns at once. The handler writes no D1 activity time. Only terminal input counts.
The initial handshake, window changes, output, and idle sockets do not count.

`TerminalConnections` owns each authenticated session and workspace/sandbox
registration. Each registration holds a `sandbox` identity of the
[shared connection reader](../security/README.md#open-connections).
That kind binds the grant to the current sandbox of a running workspace that is not archived.
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

Tests execute the three programs with fake ttyd and tmux in isolated
runtime folders. The install test runs `terminalInstallCommand()` with fake
`sudo`, `apt-get`, and `systemctl` commands. Run the tests of this area with
`npm run test -- worker/terminal`.

An org suspension refuses new sockets with 403 `org_suspended`.
The shared sandbox rule closes existing sockets at their next access check.
Terminal status reads remain available.

### Key Code

- [handler.ts](handler.ts) exports `createTerminalHandler`.
- [connections.ts](connections.ts) owns terminal registration, expiry, and scheduled access checks.
- [The shared connection reader](../security/connection-access.ts) reads each session, membership, and sandbox identity in one batch.
- [service.ts](service.ts) exports `terminalInstallCommand`, which installs both packages, the three programs, and both units. It also exports the image and start hooks, and `TERMINAL_PORT`.
- [scripts.ts](scripts.ts) builds the password program, the launcher, and the shell server with `credentialScript`, `launcherScript`, and `sessionServerScript`.
- [credentials.ts](credentials.ts) encrypts the locally generated workspace password.
- [store.ts](store.ts) binds each cached password to its current sandbox.
- [privileged.ts](privileged.ts) quotes installation and service control commands.
- [protocol.ts](protocol.ts) adds server authentication to ttyd's first JSON message.
- [scripts.test.ts](scripts.test.ts) and [install.test.ts](install.test.ts) run the programs and the install command with fakes.
- [The tools adapter](../previews/provider.ts) exposes the private port.
- [The sandbox provider](../sandbox/README.md) owns credentials, fixed routes, and bounded file reads.
- [The workspace lifecycle](../lifecycle/README.md) runs the install command in each build and the start hook after each startup script.

See [access and security](../../docs/protocol/access-and-security.md) and
[workspace tools](../../docs/protocol/workspaces-and-sandboxes.md#terminal).
