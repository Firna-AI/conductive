# Terminal backend

This area connects the app terminal to a private ttyd port.
The production route dispatcher does not call these handlers yet.
The browser uses the [shared terminal contract](../../src/shared/terminal.ts).

Call `createTerminalHandler(env, dependencies).fetch(request)` for both
shared terminal paths. The handler runs the app gate on each request and
each upgrade. Its default socket runtime uses Cloudflare WebSocket pairs.
Tests can inject `dependencies.sockets` at that boundary.

Call `installTerminalService(provider, sandboxId)` during each org image
build. The image lifecycle owner must first authorize that org's build sandbox.
It installs ttyd and enables its systemd service. It puts no password
in the image. One quoted privileged-command helper owns the root commands.
The service requires a nonsecret enable marker under `/run`.
An image build or refresh has no marker and creates no terminal password.
The unit runs ttyd and its shell as `user`, in `/home/user`.

Call `startWorkspaceTerminal(env, orgId, workspaceId, dependencies)` after
the lifecycle owner stores the sandbox ID. Call it at create and each
resume, before the owner marks the workspace ready. It enables and starts
the service. The synchronous `ExecStartPre` step creates a random password
locally under `/run`. It keeps an existing valid password on service restarts.
`RuntimeDirectoryPreserve=yes` keeps that password through an automatic restart.
The hook reads the current password from `/run/conducting-terminal/password`
through the trusted command response. It caches the password encrypted in D1.
The cache update checks that the workspace still owns the same sandbox.
The app supplies no extra terminal secret at start. The workspace token
keeps its existing scope and does not authenticate terminal access.
`/run` must stay temporary memory storage in the org image.
Do not run this start hook on an image build or a refresh.

Set `dependencies.onActivity` to notify the workspace lifecycle owner.
The handler also updates the D1 activity time. Only terminal input counts.
The initial handshake, window changes, output, and idle sockets do not count.

### Key Code

- [handler.ts](handler.ts) exports `createTerminalHandler`.
- [service.ts](service.ts) exports the image and start hooks and `TERMINAL_PORT`.
- [credentials.ts](credentials.ts) encrypts the locally generated workspace password.
- [store.ts](store.ts) binds each cached password to its current sandbox.
- [privileged.ts](privileged.ts) quotes installation and service control commands.
- [protocol.ts](protocol.ts) adds server authentication to ttyd's first JSON message.
- [The tools adapter](../previews/provider.ts) exposes the private port.

See [access and security](../../docs/protocol/access-and-security.md) and
[workspace tools](../../docs/protocol/workspaces-and-sandboxes.md#terminal).
