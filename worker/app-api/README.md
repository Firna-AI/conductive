# App API

This folder holds the browser routes of the app shell, of the workspace
lifecycle, and of feedback. `route` in [`routes.ts`](../routes.ts) tries them after the app
request gate, so each handler gets the parsed body and the signed-in user.
Each handler returns `null` for a path that it does not own. The
[Worker routes](../README.md#routes) list every route of the Worker.

## Routes

| Handler | Routes |
| --- | --- |
| `bootRoute` in [`boot.ts`](boot.ts) | `GET /api/account`, `GET /api/models`, `GET /api/get-started`, `PUT /api/account/default-model`, `PUT /api/account/new-workspace-view`, and `PUT`, `PATCH`, and `DELETE` of `/api/account/agent-logins/:agent` |
| `shellRoute` in [`shell.ts`](shell.ts) | `GET` of the sections, the repositories, the members, and the workspace list of an org. `GET` and `PUT` of the view of a workspace, and `PUT` of its read mark |
| `featureShellRoute` in [`feature-shell.ts`](feature-shell.ts) | GitHub installations and available repositories of the account; Create org with initials and repositories; settings reads and writes; repository choices; section writes; workspace names and moves |
| `archiveRoute` in [`archive.ts`](archive.ts) | `POST` of a workspace’s `archive` and `restore` |
| `chatLifecycleRoute` in [`lifecycle.ts`](lifecycle.ts) | `POST` of the workspace list, which creates a workspace. `GET` of a workspace, `POST` of its `resume` and `activity`, and image build, refresh, and log routes |
| `feedbackRoute` in [`feedback.ts`](feedback.ts) | `GET` and `POST` of `/api/feedback`. [Feedback routes](feedback.md) gives their checks, their errors, and the email |

`featureShellRoute` in [feature-shell.ts](feature-shell.ts) serves account GitHub
access, org creation with initials and repository choices, shared settings,
repository selection, sections, and workspace metadata.
The [invitation route](invitations.ts) serves the signed-in pending list and explicit acceptance.
The [archive route](archive.ts) archives and restores a workspace through its workspace object, as [Archive](../../docs/protocol/workspace-life.md#archive) says.
The [Continue route](continue.ts) starts a Continue job and reads its result in the real workspace object, as [Continue routes](../lifecycle/continue-routes.md) says.
`membersRoute` alone serves the org list and one org.
It also serves Leave, org recovery, roles, invitations, and workspace ownership.
Leave keeps the existing last-active-admin rule and native owner-change maintenance.
The [routine routes](../routines/README.md) serve routine records after the same app gate.
Section deletion moves routines to General in its workspace-move batch.
Repository deselection turns matching routines off in its repository-write batch.
Run now and run history use the same app gate.
Workspace view replies include `routine`, the run's routine ID and name, or null.
A join from the run record supplies the routine without a new lifecycle field.
Deleting the routine removes that link and keeps its normal run workspaces.
Workspace view replies also include the resolved `baseBranch`.
View writes cannot change this branch.

## Rules

- The model list and the default choice come from `CONDUCTIVE_MODELS` and
  `CONDUCTIVE_DEFAULT_CHOICE`, as
  [Deployment inputs](../../docs/deployment.md#models) says. A missing or
  invalid value gives a 503 on its own route only.
- An account reply reads `user_preferences` and the records of the agent
  logins. It also gives the page of the GitHub App from `GITHUB_APP_SLUG`,
  so a screen links to that page without a GitHub read. A login write
  encrypts the secret with `agentLoginContext(userId, agent)` and
  `BOAT_KEY_ENCRYPTION_KEY`. No reply holds a stored secret.
- A new login or a change of kind sets `noReuse` to true for a Claude
  subscription token and false for an API key. Replacing a secret of the
  same kind keeps its preference. A `PATCH` changes only that login's
  preference for the signed-in account. It needs no secret and keeps `updatedAt` as the
  last secret-save time. It returns the current metadata, including a
  disconnected status when the login was removed.
- Get started has only the steps `github-app`, `org`, and `agent-login`.
- Create org requires at least one repository. `createShellOrg` starts its
  first image build after it saves the org, its admin, and its repositories.
  A failed build start writes one fixed warning through `warnWorker`.
  The org stays, and the request still answers 201.
- A save that adds a repository starts an image build for the admin who
  added it, also after a failed build. A repeated save and a removal start
  no build. A running job takes the request without starting another job.
  A failed start writes one fixed warning through `warnWorker`. The saved
  choice stays, and the reply keeps the repository list and HTTP 200.
- The build history reply also gives `BuildsResponse.changes`: the saved
  install script change and the added and removed repositories. The
  [image build reader](../lifecycle/image-builds.md#build-jobs) owns the
  comparison.
- `getStartedGitHubComplete` owns the `github-app` step in every org state.
  The step is complete when an org of the user that is not deleted has a
  repository through an installation that is not suspended.
- Otherwise the step reads only `/user/installations`, page by page, with
  the fresh GitHub user token. A suspended installation does not count.
- A failed GitHub read leaves the step incomplete and writes one fixed
  warning through `warnWorker`. The account and Get started still load. The
  installation list of the account shows its own error.
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
  and a lifecycle action other than Restore get `409 workspace_archived`.
- `chatLifecycleRoute` gives the lifecycle handler the runner archive as a
  getter, so only a build or a refresh reads it. It gives the first message
  of a create to `acceptLifecycleFirstMessage` of the workspace object.

Org suspension keeps shell reads available.
The common browser gate refuses every org write except Leave.
The view, read-mark, shared-shell, settings, repository, Archive, and Restore SQL writes also check stored org state, so an earlier permission read cannot admit a later write.

The workspace responses give an org-local number and a canonical web link.
They give `restoreUntil` while the archived cloud computer exists, including while an expired delete retries.
Restore refuses an expired window even when the cloud computer remains.
The request's effective app origin reaches each response constructor explicitly.
Durable Object reads, Archive, and Restore receive that origin through their RPC arguments.
The machine tools use the configured app origin instead.

### List order

- The list read orders the sections by `position`, then ID. In each
  section, it orders the workspaces by `position`, then creation time,
  then ID.
- Each insert and each move computes its positions from the current rows,
  inside the D1 write transaction that saves them. No route computes a
  saved position from an earlier list read. So two overlapping moves give
  the same order as the two moves one after the other.
- `insertWorkspace` in [`workspace-insert-data.ts`](../lifecycle/workspace-insert-data.ts)
  gives a new workspace the lowest `position` of the active workspaces in
  its section, minus 1. In a section without active workspaces, the new
  workspace takes 0. So it lists first, as the
  [mockups](../../docs/mockups/src/components/workspaces/sections.ts)
  show. A position can be negative.
- The [app](../../src/app/list-changes.ts) and its
  [dev fake](../../src/app/dev/create-routes.ts) also show a new workspace
  first.
- A workspace move request holds `sectionId` and `position`, the index in
  that section. It can omit `sectionId`. Then the move uses the stored
  section of the workspace, inside the transaction. Without `position`,
  the index is 0.
- A section move request holds `position`, the index in the section list.
  Each index counts the rows without the moved row.
- A move ranks the current rows of its target from an `AS MATERIALIZED`
  snapshot, then puts the moved row at the index. That keyword makes
  SQLite compute the snapshot once, before the update changes a row.

## Development

Run `npm run test -- worker/app-api worker/chat/integration` from the
repository root. The integration tests use the production Worker entry,
local D1, Durable Objects, and WebSockets, with fake Boat and GitHub.

- `boot.test.ts` checks the boot routes, the saved preferences, the
  encrypted logins, and a missing model list. Two users save different
  defaults, New workspace views, and logins, both with a Claude login.
  After each save and a delete, each reads only their own account and
  Get started step.
  `boot-account.test-support.ts` holds the account helpers of that test.
- `agent-login-secret.test.ts` checks that a saved login keeps no
  whitespace, and that a read removes the whitespace of an older login.
- `agent-login-reuse.test.ts` checks the login-kind defaults, the private
  preference update, and unchanged secret data and timestamps.
- `feature-github-install.test.ts` checks the install link of the GitHub
  App, and the default app when the slug is missing or not valid.
- `shell-resources.test.ts` and `chat-read-state.test.ts` check the lists,
  the private views, the encoded workspace IDs, the archived writes, and
  the read marks.
- `chat-create-journey.test.ts` boots the shell, creates a workspace, and
  delivers the first message through a Stop and a resume.
- `machine-credentials.test.ts` checks the two machine credential routes.
- `feature-shell-settings.test.ts` checks shared scripts, encrypted env
  values, secret marks, mark changes without replacement values, member
  reads, and refused member writes through the Worker.
- `feature-shell-sections.test.ts` checks section order, private collapse,
  workspace moves, section deletion, and workspace event publication.
- `feature-workspaces-data.test.ts` and `feature-sections-data.test.ts`
  commit a second move just before the batch of a first move. They check
  that the order keeps both moves: a move out of the target section, two
  moves in one section, and two section moves. They also check refused
  moves when an org suspension commits before the batch, and a move
  without `sectionId` after the workspace moved to another section.
- [`workspace-data.test.ts`](../lifecycle/workspace-data.test.ts) in the
  lifecycle folder checks that a new workspace lists first, before and
  after a move. It runs with the lifecycle tests.
- `shell-list.test-support.ts` gives these three test files their org,
  sections, and rows. Its D1 wrapper commits the second move of the move
  tests.
- `feature-shell-github.test.ts` checks the user's GitHub access, paginated
  repository reads, saved org initials, and admin repository selection.
- `feature-org.test.ts` checks the repository requirement, the first build,
  and a failed build start that keeps the org.
- `feature-settings-builds.test.ts` checks the install script change in
  the build history before and after the first image.
- `feature-repository-builds.test.ts` checks the admin's repository build,
  repeated saves, removals, adds after a failed build, and a failed start
  that keeps the choice.
- `feedback.test.ts`, `feedback-refusals.test.ts`, and
  `feedback-body.test.ts` check the feedback routes with a fake Resend, as
  [Feedback routes](feedback.md#development) says.

### Key code

- [`boot.ts`](boot.ts), [`account-data.ts`](account-data.ts),
  [`get-started-data.ts`](get-started-data.ts), and
  [`models.ts`](models.ts): the account, its logins, Get started, and the
  model variables.
- [`get-started-github.ts`](get-started-github.ts):
  `getStartedGitHubComplete`, the one owner of the `github-app` step.
- [`shell.ts`](shell.ts) and [`shell-data.ts`](shell-data.ts): the lists of
  an org and the read marks. The workspace list shares `workspaceColumns`
  with `readWorkspace` in
  [`workspace-data.ts`](../lifecycle/workspace-data.ts). Its SQL joins
  compute `installScriptChanged` from the current image of each workspace's
  org and provider account.
- [`workspace-view.ts`](workspace-view.ts): the saved view of each member.
- [`workspace-state.ts`](workspace-state.ts): the state of a workspace for
  its reader, and the refusal of archived writes.
- [`workspace-path.ts`](workspace-path.ts): the workspace ID of a path.
- [`lifecycle.ts`](lifecycle.ts): the lifecycle routes and their options.
- [`continue.ts`](continue.ts): `continueRoute`, which checks the Continue
  request body and gives the start and each poll to the workspace object.
- [`feature-shell.ts`](feature-shell.ts): shell write dispatch after the
  request gate. [`feature-settings.ts`](feature-settings.ts) encrypts env
  values and their secret marks. Replies return names and marks only.
  [`feature-sections.ts`](feature-sections.ts)
  and [`feature-workspaces.ts`](feature-workspaces.ts) save list changes and
  publish workspace metadata through the workspace object.
- [`feature-workspaces-data.ts`](feature-workspaces-data.ts):
  `updateShellWorkspace`, the rename and the move of a workspace in one D1
  batch. [`feature-sections-data.ts`](feature-sections-data.ts): the
  section writes `insertShellSection`, `updateShellSection`, and
  `deleteShellSection`. [List order](#list-order) gives their rules.
- [`feature-github.ts`](feature-github.ts): account installations and
  repositories read with the fresh GitHub user token.
  [`feature-org.ts`](feature-org.ts) creates an org with its chosen
  repositories and starts its first build with `startImageBuild` of the
  [image lifecycle](../lifecycle/image-builds.md).
  [`feature-repositories.ts`](feature-repositories.ts) merges
  the org's saved choices with repositories that its reader can access,
  and starts a build after an add.
  Their `*-data.ts` files keep queries and guarded writes.
- [`feedback.ts`](feedback.ts), [`feedback-input.ts`](feedback-input.ts),
  [`feedback-data.ts`](feedback-data.ts), and
  [`feedback-mail.ts`](feedback-mail.ts): the feedback routes, the checked
  body, the reply email and reachable IDs, and the email.
  [Feedback routes](feedback.md#key-code) gives each entry point.

### Related docs

- [Worker backend](../README.md)
- [Workspace lifecycle](../lifecycle/README.md#browser-routes)
- [Deployment inputs](../../docs/deployment.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md)
- [Feedback](../../docs/protocol/feedback.md)
- [Shared contracts](../../src/shared/README.md)
