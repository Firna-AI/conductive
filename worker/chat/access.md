# Chat access

The [chat backend](README.md) runs these gates in the workspace Durable
Object. [Access and security](../../docs/protocol/access-and-security.md)
states the requirements.

The Durable Object runs the gates itself.

- A forwarded browser chat request keeps the body limit of the Worker
  entry and the host and `Origin` checks. The outer Worker skips its
  request gate, so only the gate of the Durable Object parses the JSON body.
- `authorizeBrowser` runs `gate` from `worker/security/gate.ts`, the gate
  of the other app routes. It checks the app hostname, the `Origin`
  header, the session cookie, the org membership, and the body of writes.
- `findChatWorkspace` then reads the workspace from D1. The workspace must
  belong to that org, and the org must not be deleted.
- Each browser write then enters the serial queue of the object. In the
  queue, `authorizeChatBrowser` checks the access again, with the body that
  the gate already read and the time of the queued check. It runs
  `gateAccess`, the [access checks](../security/README.md#access-checks) of
  the gate, and reads the workspace and its archive state again. This
  repeats the D1 reads of the first check. So a write that waited for its
  body or for the queue gets the refusal that a new request would get. An
  example is `401 sign_in_required` after a sign-out. The write saves
  nothing. Reads and the events socket take no second check.
- Each open tab holds a `workspace` identity. The
  [shared connection reader](../security/README.md#open-connections) of
  the security area gives it a grant with a deadline. The `workspace` kind
  needs no running sandbox. So the tabs of a stopped or archived workspace
  stay open.
- The Durable Object reads the first grant of a new tab before the
  history read. It checks the grant again before it sends the history. A
  tab without a valid grant gets no history and `404 workspace_not_found`.
- Each event send checks the grant first, without a D1 read. A tab with
  an expired grant closes and gets no event.
- Every 15 seconds, one D1 query refreshes the grants of all open tabs.
  The refresh closes each tab without a new grant. Sign-out, membership
  removal, a suspension of the user, session expiry, and org deletion end
  access. A failed read closes each tab of its batch.
- A separate expiry timer closes each tab at its grant deadline, also
  while a refresh read waits. A late read result cannot reopen a closed
  tab.
- Both timers stop when the last tab closes.
- An archived workspace still serves its history and its events socket.
  Each write gets `409 workspace_archived`.
- `connectRunner` accepts only `/v1/runner` on `MACHINE_ORIGIN`, with
  `Authorization: Bearer <workspace token>`.
- `tokenWorkspace` hashes the token. It accepts a token that is not
  revoked, of a workspace that is not archived, in an org that is not
  deleted, with an owner who is not suspended.
  `workspaceTokenAccessPredicate` in
  [`workspace-token-access.ts`](../data/workspace-token-access.ts) holds
  that rule. The agent tools, the git credential route, and the Mac
  commands use it too.
- The runner sends `hello` first, with `RUNNER_PROTOCOL_VERSION` and its
  workspace ID. A new runner connection closes the previous one.
- The runner version must meet the workspace's stored minimum version.
  A missing pin counts as version 1. A lower version closes the connection
  before the welcome or any command. The Worker logs an operator warning.
  It adds no app message.
- `AuthenticatedRunner` keeps the token hash of its connection. It checks
  the token rule again before each message that it sends or receives, and
  every 15 seconds while the connection is idle, with no cached result. A
  failed rule or a failed read closes the connection.
- The first workspace that passes a gate binds the Durable Object. Each
  other workspace gets `404 workspace_not_found`. So does a workspace that
  `matchesObject` refuses, because `WORKSPACES.idFromName` names another
  object.
- Every login lookup goes through `SessionLogins`. Its credential path uses
  `readLogin` in `login-access.ts`, the only caller of `resolveLogin`. It
  reads the agent login of a starter or of a linked-session member, for one
  agent. `resolveLogin` first checks the workspace, that user, the sender,
  and the runner token in one D1 read. The workspace must pass the token
  rule above, without the token. That user and the sender must be members
  who are not suspended. The same read checks the share setting of the
  login, `agent_logins.no_reuse`, before it reads a secret. An override
  replaces only the login read. A refusal to share keeps the starter's own
  login available, so `SessionLogins.observe` stores
  `loginAvailable: true` and `loginShared: false`. Send uses the existing
  empty linked session, and queued member commands cannot receive the
  starter's login while the starter does not share it.
- Its metadata path, `readLoginMetadata`, reads only the membership, the
  suspension, the stored login kind, and the share setting of each starter,
  in one D1 query. It returns a map of `SessionLoginMetadata` by session
  ID. A valid login gives `loginAvailable: true`, and `loginShared` is true
  when `no_reuse` is 0. A missing or invalid login gives false for both.
  The workspace must also pass the token rule above. So a suspended starter
  or a refused workspace shows an unavailable login. The result sets only
  `loginAvailable` and `loginShared`, so the session list, the history, and
  the event subscription stay readable. It reads no ciphertext.
- A revoked or replaced runner token closes that connection without a
  login, and the command stays queued. A sender who left the org gets no
  login either. [Session logins](integration/README.md#session-logins) says
  when the workspace checks the starter's login. The storage never holds a
  login.

An org suspension keeps chat history and event subscriptions readable.
The common browser write gate refuses session and message changes with `org_suspended`.
The second access check of each browser write refuses such a change again in the queue.
This also holds when the suspension starts while the change waits.
The shared token rule refuses runners and agent logins for the org.
