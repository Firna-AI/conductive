# App API

This folder holds the browser routes of the app shell and of the workspace
lifecycle. `route` in [`routes.ts`](../routes.ts) tries them after the app
request gate, so each handler gets the parsed body and the signed-in user.
Each handler returns `null` for a path that it does not own. The
[Worker routes](../README.md#routes) list every route of the Worker.

## Routes

| Handler | Routes |
| --- | --- |
| `bootRoute` in [`boot.ts`](boot.ts) | `GET /api/account`, `GET /api/models`, `GET /api/get-started`, `PUT /api/account/default-model`, and `PUT` and `DELETE` of `/api/account/agent-logins/:agent` |
| `shellRoute` in [`shell.ts`](shell.ts) | `GET` of the sections, the repositories, the members, and the workspace list of an org. `GET` and `PUT` of the view of a workspace, and `PUT` of its read mark |
| `chatLifecycleRoute` in [`lifecycle.ts`](lifecycle.ts) | `POST` of the workspace list, which creates a workspace. `GET` of a workspace, and `POST` of its `resume` and `activity` |

## Rules

- The model list and the default choice come from `CONDUCTIVE_MODELS` and
  `CONDUCTIVE_DEFAULT_CHOICE`, as
  [Deployment inputs](../../docs/deployment.md#models) says. A missing or
  invalid value gives a 503 on its own route only.
- An account reply reads `user_preferences` and the records of the agent
  logins. A login write encrypts the secret with
  `agentLoginContext(userId, agent)` and `BOAT_KEY_ENCRYPTION_KEY`. No reply
  holds a stored secret.
- Get started has only the steps `github-app`, `org`, and `agent-login`.
- A repository without a GitHub installation is not in the list.
- Each member has a view of their own. A read mark only moves forward, and
  it stops at the last event number of the workspace.
- The list and the lifecycle replies give each reader one state.
  Archived, starting, stopped, error, and input come from the workspace
  record. Otherwise, the chat summary of the workspace object and the
  reader's read mark give working, unread, or ready. The list and a create
  reply read it with `readChatWorkspaceSummary`. A read or a Resume reply
  takes it from the same read as its record, as
  [Browser routes](../lifecycle/README.md#browser-routes) says.
- A workspace path decodes its workspace ID once.
- An archived workspace keeps its view readable. A view write, a read mark,
  and a lifecycle action get `409 workspace_archived`.
- `chatLifecycleRoute` gives the lifecycle handler the runner archive as a
  getter, so only a build or a refresh reads it. It gives the first message
  of a create to `acceptLifecycleFirstMessage` of the workspace object.

## Development

Run `npm run test -- worker/app-api worker/chat/integration` from the
repository root. The integration tests use the production Worker entry,
local D1, Durable Objects, and WebSockets, with fake Boat and GitHub.

- `boot.test.ts` checks the boot routes, the saved preferences, the
  encrypted logins, and a missing model list. Two users save different
  defaults and logins, both with a Claude login. After each save and a
  delete, each reads only their own account and Get started step.
  `boot-account.test-support.ts` holds the account helpers of that test.
- `shell-resources.test.ts` and `chat-read-state.test.ts` check the lists,
  the private views, the encoded workspace IDs, the archived writes, and
  the read marks.
- `chat-create-journey.test.ts` boots the shell, creates a workspace, and
  delivers the first message through a Stop and a resume.
- `machine-credentials.test.ts` checks the two machine credential routes.

### Key code

- [`boot.ts`](boot.ts), [`account-data.ts`](account-data.ts),
  [`get-started-data.ts`](get-started-data.ts), and
  [`models.ts`](models.ts): the account, its logins, Get started, and the
  model variables.
- [`shell.ts`](shell.ts) and [`shell-data.ts`](shell-data.ts): the lists of
  an org and the read marks.
- [`workspace-view.ts`](workspace-view.ts): the saved view of each member.
- [`workspace-state.ts`](workspace-state.ts): the state of a workspace for
  its reader, and the refusal of archived writes.
- [`workspace-path.ts`](workspace-path.ts): the workspace ID of a path.
- [`lifecycle.ts`](lifecycle.ts): the lifecycle routes and their options.

### Related docs

- [Worker backend](../README.md)
- [Workspace lifecycle](../lifecycle/README.md#browser-routes)
- [Deployment inputs](../../docs/deployment.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md)
- [Shared contracts](../../src/shared/README.md)
