# Terminal backend

This area connects the app terminal to a private ttyd port.
It is the only owner of the terminal software in a sandbox: ttyd, its
systemd service, its launcher, and its password program.
The [sandbox software](../../image/README.md) holds no terminal file.
The production route dispatcher does not call these handlers yet.
The browser uses the [shared terminal contract](../../src/shared/terminal.ts).

Call `createTerminalHandler(env, dependencies).fetch(request)` for both
shared terminal paths. The handler runs the app gate on each request and
each upgrade. Its default socket runtime uses Cloudflare WebSocket pairs.
Tests can inject `dependencies.sockets` at that boundary.

Run `terminalInstallCommand()` in the software command of each org image
build. The build runs that command detached and writes its output to the
build log. The image lifecycle owner must first authorize that org's build
sandbox. The command installs ttyd and enables its systemd service. It puts
no password in the image. `installTerminalService(provider, sandboxId)` runs
the same command for a caller that needs a synchronous install hook.

One quoted privileged-command helper owns the root commands.
The service requires a nonsecret enable marker under `/run`.
An image build or refresh has no marker and creates no terminal password.
The unit runs ttyd and its shell as `user`. The launcher loads the workspace
variables from `/run/ascii-secrets/env.sh`. It then opens the shell in
`CONDUCTING_REPOSITORY_DIR`, the repository folder.

Call `startWorkspaceTerminal(env, orgId, workspaceId, dependencies)` after
the workspace startup script succeeds. The lifecycle owner must store the
sandbox ID first. Call the hook at create and each resume, before the owner
marks the workspace ready. Do not run this start hook on an image build, a
refresh, or a disk retention restart.

The hook writes the enable marker and starts the service. The synchronous
`ExecStartPre` step creates a random password locally under `/run`. It keeps
an existing valid password on service restarts. `RuntimeDirectoryPreserve=yes`
keeps that password through an automatic restart. The readiness command
returns no password in stdout or command history.

The hook reads `/run/conducting-terminal/password` through the provider's
bounded file API, with a 64-byte limit. It refuses a password that is not
exactly 64 lowercase hexadecimal characters. It caches that password
encrypted in D1. The cache update checks that the workspace still owns the
same sandbox.

The app supplies no extra terminal secret at start. The workspace token
keeps its existing scope and does not authenticate terminal access.
`/run` must stay temporary memory storage in the org image.

Set `dependencies.onActivity` to notify the workspace lifecycle owner.
The handler also updates the D1 activity time. Only terminal input counts.
The initial handshake, window changes, output, and idle sockets do not count.

`TerminalConnections` owns each authenticated session and workspace/sandbox
registration. Each registration holds a `sandbox` identity of the
[shared connection reader](../security/README.md#open-connections).
That kind binds the grant to the current sandbox of a running workspace that is not archived.
Chat tabs use the `workspace` kind, which has no sandbox check.
`add` reads the first grant before the handler connects to the ttyd port.
The shared reader sets the deadline of each grant.

One query checks its live registrations every 15 seconds.
An independent deadline cancels idle connections if an access read stalls.
Frame checks use only the live registration. They run no D1 access query.
Cleanup removes the registration and its scheduled work.
Inject `dependencies.terminalSchedule` and `now` to test these deadlines.

`scripts.ts` builds the exact credential and launcher programs installed in
the image. Its trusted options select paths, account names, and executables.
The credential program captures entropy before conversion and commits a
complete password through a temporary file. The launcher checks the password
before it executes ttyd. Tests execute both programs in isolated runtime folders.

### Key Code

- [handler.ts](handler.ts) exports `createTerminalHandler`.
- [connections.ts](connections.ts) owns terminal registration, expiry, and scheduled access checks.
- [The shared connection reader](../security/connection-access.ts) reads each session, membership, and sandbox identity in one batch.
- [service.ts](service.ts) exports `terminalInstallCommand`, the image and start hooks, and `TERMINAL_PORT`.
- [scripts.ts](scripts.ts) builds the credential and launcher programs.
- [credentials.ts](credentials.ts) encrypts the locally generated workspace password.
- [store.ts](store.ts) binds each cached password to its current sandbox.
- [privileged.ts](privileged.ts) quotes installation and service control commands.
- [protocol.ts](protocol.ts) adds server authentication to ttyd's first JSON message.
- [The tools adapter](../previews/provider.ts) exposes the private port.
- [The sandbox provider](../sandbox/README.md) owns credentials, fixed routes, and bounded file reads.
- [The workspace lifecycle](../lifecycle/README.md) runs the install command in each build and the start hook after each startup script.

See [access and security](../../docs/protocol/access-and-security.md) and
[workspace tools](../../docs/protocol/workspaces-and-sandboxes.md#terminal).
