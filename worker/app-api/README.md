# App API

This folder holds the browser routes of the app shell, of the workspace
lifecycle, and of feedback. `route` in [`routes.ts`](../routes.ts) tries them after the app
request gate, so each handler gets the parsed body and the signed-in user.
Each handler returns `null` for a path that it does not own. The
[Worker routes](../README.md#routes) list every route of the Worker.

## Routes

| Handler | Routes |
| --- | --- |
| `bootRoute` in [`boot.ts`](boot.ts) | `GET /api/account`, `GET /api/account/stats`, `GET /api/models`, `GET /api/get-started`, `PUT /api/account/default-model`, `PUT /api/account/favourites`, `PUT /api/account/new-workspace-view`, `PUT /api/account/shortcuts`, and `PUT`, `PATCH`, and `DELETE` of `/api/account/agent-logins/:agent` |
| `endpointModelsRoute` in [`endpoint-models.ts`](endpoint-models.ts) | `POST /api/account/agent-logins/:agent/models/refresh` |
| `orgAgentLoginsRoute` in [`org-agent-logins.ts`](org-agent-logins.ts) | `GET /api/orgs/:orgId/agent-logins`; admin `PUT`, `PATCH`, and `DELETE` of `/:agent`; admin `POST` of `/:agent/models/refresh` |
| `codexDeviceRoute` in [`codex-device.ts`](codex-device.ts) | `POST /api/account/agent-logins/codex/device` starts a ChatGPT sign-in. `POST` of its `/:handle` polls and exchanges it |
| `shellRoute` in [`shell.ts`](shell.ts) | `GET` of the sections, the repositories, the members, and the workspace list of an org. `GET` and `PUT` of the view of a workspace, and `PUT` of its read mark |
| `branchesRoute` in [`branches.ts`](branches.ts) | `GET /api/orgs/:orgId/repositories/:repositoryId/branches` reads live branches with the member's fresh GitHub user token |
| `featureShellRoute` in [`feature-shell.ts`](feature-shell.ts) | GitHub installations and available repositories of the account; Create org with initials and repositories; settings reads and writes; `GET /api/orgs/:orgId/settings/skills`; repository choices and moves; section writes; workspace names and moves |
| `archiveRoute` in [`archive.ts`](archive.ts) | `POST` of a workspace’s `archive` and `restore` |
| `mergeQueueRoute` in [`merge-queue.ts`](merge-queue.ts) | `POST` and `DELETE` of a workspace's `merge-queue`. `PUT` of its `merge-queue/order`. `POST` of its `merge-queue/merge`. |
| `chatLifecycleRoute` in [`lifecycle.ts`](lifecycle.ts) | `POST` of the workspace list, which creates a workspace. `GET` of a workspace, `POST` of its `resume` and `activity`, and image build, refresh, and log routes |
| `feedbackRoute` in [`feedback.ts`](feedback.ts) | `GET` and `POST` of `/api/feedback`. [Feedback routes](feedback.md) gives their checks, their errors, and the email |
| `secretsRoute` in [`secrets.ts`](secrets.ts) | `GET` and `POST /api/orgs/:orgId/secrets`, `PATCH` and `DELETE` of `/:secretId`, and `PUT` of `/:secretId/all-agents` |
| `capabilitiesRoute` in [`capabilities.ts`](capabilities.ts) | `GET` and `PATCH /api/orgs/:orgId/workspaces/:workspaceId/capabilities` |

`featureShellRoute` in [feature-shell.ts](feature-shell.ts) serves account GitHub
access, org creation with initials and repository choices, shared settings,
repository selection, sections, and workspace metadata.
The [invitation route](invitations.ts) serves the signed-in pending list and explicit acceptance.
The [archive route](archive.ts) archives and restores a workspace through its workspace object, as [Archive](../../docs/protocol/workspace-life.md#archive) says.
The [merge queue backend](../merge-queue/README.md) runs each queue change through its repository coordinator.
`POST /merge-queue/merge` takes `{ "ahead": number }` with the count shown
in the workspace's GitHub bar. It returns an empty `202` when the
coordinator accepts the merge. It uses the requesting member's GitHub
token and merge method.

The workspace list also carries its repositories' names, default branches,
and selection. The drop target uses saved queue and GitHub facts before it
sends Add. [The list refresh](list-queue-refresh.ts) claims stale facts in
D1 and reads GitHub in the background. It records write access by viewer
and groups pull request and rule reads by repository. A queue write or pull
request event marks the facts old. The cleanup timer removes expired facts.
Add and remove take an empty JSON object. Re-order takes a target workspace ID in `beforeWorkspaceId`, or null for the end.
Each successful change returns 204.
The workspace list gives the optional queue entry and its removal plan,
GitHub write access for the viewer, and the saved GitHub base of an open
pull request. Branch labels use the environment of each workspace start.
The [Continue route](continue.ts) starts a Continue job and reads its result in the real workspace object, as [Continue routes](../lifecycle/continue-routes.md) says.
The [repository change route](repository-change.ts) starts a repository change and reads its result in the same way, as [Repository change](../lifecycle/repository-change.md#routes) says.
`membersRoute` alone serves the org list and one org.
It also serves Leave, org recovery, roles, invitations, and workspace ownership.
Leave keeps the existing last-active-admin rule and native owner-change maintenance.
The [automation routes](../automations/README.md) serve automation records after the same app gate.
Section deletion moves automations to General in its workspace-move batch.
Repository deselection turns matching automations off in its repository-write batch.
Run now and run history use the same app gate.
Workspace view replies include `automation`, the run's automation ID and name, or null.
A join from the run record supplies the automation without a new lifecycle field.
Deleting the automation removes that link and keeps its normal run workspaces.
Workspace view replies also include the resolved `baseBranch`.
View writes cannot change this branch.

## Rules

- The workspace GET includes `seed` at its ordered `eventNumber`. The
  workspace object waits for any recovery before it reads both fields.
  Resume gives the workspace, start, error, and event number.
  [Browser routes](../lifecycle/routes.md#browser-routes) gives the order.
- [Model configuration dependencies](../../docs/deployment/models.md#configuration-failures)
  states which operations need `CONDUCTIVE_MODELS` and
  `CONDUCTIVE_DEFAULT_CHOICE`, and their failures.
- Each model of the list can carry the `fast` mark.
  `PUT /api/account/default-model` saves fast mode with the model and the
  effort. It stores fast mode as off for a model without the mark, and a
  saved default without fast mode reads as off.
  [Fast mode](../../docs/protocol/fast-mode.md#the-models-with-fast-mode)
  states the rules.
- An account reply reads `user_preferences`, `user_shortcuts`, and the records of the agent
  logins. It also gives the page of the GitHub App from `GITHUB_APP_SLUG`,
  so a screen links to that page without a GitHub read. A login write
  encrypts the secret with `agentLoginContext(userId, agent)` and
  `BOAT_KEY_ENCRYPTION_KEY`. No reply holds a stored secret.
- [Model favourites](../../docs/protocol/model-favourites-account.md#the-account-routes)
  gives the account favourites contract. `accountFavourites` and
  `saveAccountFavourites` in [`account-data.ts`](account-data.ts) read and
  save its JSON list. `configuredStartingFavourites` in [`models.ts`](models.ts)
  reads the deployment setting for an account without a saved list.
- Account and org-login reads include additive `defaultLogins` entries for
  each current org and agent. [`default-agent-logins.ts`](default-agent-logins.ts)
  uses the common login access query and default order from `worker/chat/`.
  Each entry names the selected personal or org owner, or null when neither serves.
  An endpoint entry includes the model availability used by member pickers.
  Its separate `orgModelList` serves fixed org sessions even when the default is personal.
  Suspended orgs give no usable default or model list. Deleted orgs are absent.
- `GET /api/account/stats` returns `AccountStats` from the
  [account contract](../../src/shared/account.ts) for the signed-in user
  only. [`account-stats.ts`](account-stats.ts) reads every count from D1 in
  one batch, with the windows and the state SQL of the operator Overview
  from [`workspace-counts.ts`](../operator/workspace-counts.ts). As the
  Overview reply does, `archived` counts every archived workspace, removed
  ones included, so an older app that reads four states still adds up to
  the total. `removed` counts the removed ones again, and the app takes
  them out of Archived. It leaves out deleted orgs and skipped automation
  runs. A run counts for the `owner_user_id` of its row. The route keeps no
  history and calls no sandbox provider.
  [Account stats](../../docs/protocol/account-stats.md) states the rules.
- Org login routes use the paths in `org-settings.ts` and the contracts in
  [`org-agent-logins.ts`](../../src/shared/org-agent-logins.ts).
  [`org-agent-login-save.ts`](org-agent-login-save.ts) reuses the endpoint
  address rule, model discovery, and authenticated encryption helpers.
  A personal owner keeps its existing encryption context. An org owner
  uses `org-agent-login:<orgId>:<agent>`.
  [`org-agent-login-data.ts`](org-agent-login-data.ts) guards each write
  with the current active admin predicate in the same SQL statement.
  Replace keeps the switch across kinds. A switch write changes no login
  version. [`org-agent-login-read.ts`](org-agent-login-read.ts) returns
  metadata for both agents, with a disconnected entry for an absent login.
  Only an admin of an active org receives `agentLogins.modelList`.
  The selected default's model availability also serves member pickers. No reply holds
  ciphertext, a key, or a full address. Save and Refresh report model read
  failures. Endpoint saves also report whether they added `/v1`.
  [Org logins](../../docs/protocol/org-logins.md) states the requirements.
- An own endpoint save uses `readEndpointAddress` from
  [`endpoint-address.ts`](../../src/shared/endpoint-address.ts). It encrypts
  one JSON value with the normalized endpoint and the whitespace-free key,
  under the same context. Only the endpoint origin stays in plain text.
  Save and preference replies give the host, kind, share setting, and last
  secret-save time. They never give the full address.
  `accountLogins` requires the app model getter for account reads and share replies.
  Both replies keep the saved `modelList`, including its missing app IDs and read time.
  Save reads the endpoint model list before encryption and storage.
  A Codex save can select a `/v1` base through the bounded reads in
  [Own endpoints](../model-gateway/own-endpoints.md).
  A failed read never fails the save.
  One statement replaces the login and its old model list with the new list, if any, and attempt time.
  Endpoint save replies include boolean `endpointV1Added` and `modelListReadFailed`.
  The first says that the second read selected a `/v1` base.
  The second says that the save read no list. Native login replies omit both.
  [`account-models.ts`](account-models.ts) adds the optional `modelList` to
  an own endpoint login in the signed-in user's account reply.
  Its `missing` array holds app model IDs absent from the last successful list.
  Its `checkedAt` holds that successful read's Unix millisecond time.
  No successful read means no `modelList`.
  A list with no matching app model reports all of that agent's app IDs as missing.
  The browser uses that case to keep every model available.
  An unavailable model configuration leaves discovery metadata out of the account reply.
  The model-list route keeps its existing configuration error.
  Refresh reads only the signed-in user's login and answers HTTP 200 with
  `RefreshAgentLoginModelsResponse`: `{ modelListReadFailed: boolean }`.
  The flag is false when Refresh read a list, and true otherwise.
  A removed or native login makes Refresh do nothing and sets the flag to true.
  Refresh never changes the stored address.
  Read the account again after Refresh to obtain the last successful result.
  The builder accepts public HTTPS addresses with host names.
  It refuses every IPv4 and IPv6 address, credentials, and non-public names.
  It reads the product domain from the shared brand source.
  The save also passes `env.PREVIEW_DOMAIN` to refuse that deployment's preview domain and its subdomains.
  It preserves the query and drops the fragment and trailing slash.
  For Claude, it also drops a final `/v1`.
  A valid own endpoint runs through the model gateway.
  An invalid saved address makes it unavailable in chat.
- `PUT /api/account/shortcuts` takes `SaveShortcutsRequest` and returns
  `SaveShortcutsResponse` from the shared shortcut contracts. The shared
  reader checks the whole request before any write. A contract error
  returns HTTP 400 with `invalid_input` and the reader's message.
  Enter with any modifiers and plain Space are fixed keys on both keyboards.
  Only keypad digits can use keypad names in a saved key.
  `shortcuts-data.ts` batches the changes and the reply's read in one D1
  transaction. Null keys delete a row. Empty keys keep an empty override.
  The account's `shortcuts` field carries both keyboards and skips retired
  commands. The shared reply reader drops unreadable or fixed stored keys.
  It preserves valid keys in order and keeps empty overrides. A change
  that loses every key falls back to defaults. Each unreadable stored row,
  including bad JSON, is skipped without blocking the account or save reply.
  The Worker logs fixed warning text when it skips unreadable data.
  The foreign key deletes these rows
  with their user. [Storage](../../docs/protocol/keyboard-shortcuts.md#storage)
  gives the requirements.
- A new login or a change of kind sets `noReuse` to true for a Claude
  subscription token or a Codex ChatGPT sign-in, and false for an API key or an own endpoint.
  The Worker and the dev backend use `defaultAgentLoginNoReuse` in the
  [account contract](../../src/shared/account.ts) for these defaults.
  Replacing a secret of the same kind keeps its preference. A `PATCH`
  changes only that login's preference for the signed-in account. It needs
  no secret and keeps `updatedAt` as the last secret-save time. It returns
  the current metadata, including a
  disconnected status when the login was removed.
- Codex connects to ChatGPT through the [device sign-in service](../codex-auth/README.md).
  Its start reply holds the code, verification link, expiry, and poll interval.
  Its poll reply reports waiting, connected, expired, or failed.
  An unfinished sign-in compares the saved login date with the current login
  before each OpenAI request and in its final conditional login write.
  A change ends the sign-in with a cause that asks for a new code.
  After completion, each poll reads the current Codex login through `accountLogins`.
  A removed login returns a disconnected status while the sign-in state stays connected until expiry.
  The required credential task owner retains the poll's exchange and save through `execution.waitUntil`.
  Both routes use the signed-in account. A handle from another account returns 404.
  The ordinary login save accepts only an API key for Codex.
  A connected Codex login can carry `unusableCause` after a refused renewal.
  Reconnect clears the failure and its refresh claim.
- Get started has only the steps `github-app`, `org`, and `agent-login`.
  The agent step completes with a usable personal login or an org login.
  `get-started-data.ts` uses the same default resolver as message admission.
- Create org requires at least one repository. `createShellOrg` starts its
  first image build after it saves the org, its admin, and its repositories.
  The [assignment service](../provider-assignment/README.md) selects and saves
  the provider account of the org before that build. Only an operator can
  supply a configured account choice. Other users get a draw from the weights.
  A failed build start writes one fixed warning through `warnWorker`.
  The org stays, and the request still answers 201.
- A save that adds a repository starts an image build for the admin who
  added it, also after a failed build, unless its body says
  `build: false`. The app sends that body, so that Done of the
  Repositories tab starts one build for every add of an edit. A request
  without the field, from an older copy of the app, still builds at the
  add. A repeated save and a removal start no build. An ordinary running
  job takes the request without starting another job. During a hidden
  switch build, the add records a member build that waits.
  [Provider switches](../lifecycle/provider-switches.md) gives its first
  log line and its execution deadline.
  A failed start writes one fixed warning through `warnWorker`. The saved
  choice stays, and the reply keeps the repository list and HTTP 200.
- `PUT` and `DELETE` on `repositoryPath` add and remove a repository, for
  an admin. Each reply is `RepositoriesResponse`: the stored repositories
  after the save, merged with the GitHub repositories of the admin. The
  route reads those GitHub repositories once, before the save, so that no
  call to GitHub can fail a change that saved. A failed read fails the
  change before it saves. A removal by an admin without a saved GitHub
  connection reads nothing from GitHub. Its reply holds the stored
  repositories only.
- Each repository of the repository list and of these replies gives
  `imageReady` and `ready`. `imageReady` says whether the org has a
  published image: the image that a create checks, on the current
  provider account of the org. `ready` says whether that image holds the
  repository, so it is false without an image. It does not follow
  `selected`, so a removed repository stays ready until an image without
  it publishes.
- `REPOSITORY_ORDER` in [`repository-order.ts`](../data/repository-order.ts)
  gives the repository order of an org. The chosen repositories come
  first, by `position`, then a chosen row without a position, then the
  repositories that are not chosen. The name order breaks each tie: the
  lower-case GitHub name, then the exact name, then the ID. The repository
  list, its merge with the GitHub repositories of the person, and the agent
  tool list use this order. The image build keeps its order by ID.
- An add gives the repository the last position, also when the org chose
  it before. Each add first gives every chosen row a position again, from
  0, in the current order, so that a row that the previous Worker added
  gets one. A Remove clears the position. Create org gives its
  repositories positions in the name order.
- `PUT` on `repositoryPositionPath` moves one chosen repository, for an
  admin. Its body `MoveRepositoryRequest` holds `index`, which counts the
  chosen repositories without the moved one. A larger index moves it to
  the end. A body without a number index gets `400 invalid_input`. A
  repository that is not chosen moves nothing. The reply is
  `RepositoryOrderResponse`, the IDs of the chosen repositories in the
  saved order. It reads stored data only, so that no call to GitHub can
  fail a move that saved. A move starts no build, and it keeps the settings
  revision, because the image does not depend on the order.
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
- Settings reads and saves return `skillsRepository` and
  `trustedSkillsRepository`. Admins save them through
  `PATCH /api/orgs/:orgId/settings`. A GitHub link becomes `owner/name`.
  Empty text removes it. Other text stays as typed.
  `savedSkillsRepositorySettings` resolves the pair on every retry.
  A grant must match the resulting valid source without letter case.
  A replacement without a matching grant clears trust. Unrelated saves
  keep the pair. The SQL compare-and-swap checks both names and the current
  active-admin guard. A trust change starts no image build.
  [Repository trust](../../docs/protocol/org-skills-trust.md#save) states
  the save contract.
- `GET /api/orgs/:orgId/settings/skills` reads the saved repository for any
  org member. Call it when the Skills section loads and after Save.
  It returns `SkillsRepositoryLookupResponse` from the shared settings types.
  It stores no list. GitHub failures leave settings reads and saves available.
  An expired GitHub sign-in keeps the existing sign-in error.
- Each member has a view of their own. A read mark only moves forward, and
  it stops at the last event number of the workspace.
- The list and the lifecycle replies give each reader one state.
  Archived, starting, stopped, error, and input come from the workspace
  record. Otherwise, the chat summary of the workspace object and the
  reader's read mark give working, unread, or ready. The list and a create
  reply read it with `readChatWorkspaceSummary`. A read or a Resume reply
  takes it from the same read as its record, as
  [Browser routes](../lifecycle/README.md#browser-routes) says.
- Each full workspace record also gives `github`, the GitHub summary of
  its pull request, or null. The list and lifecycle readers select it from
  the D1 workspace row. So the summary adds no GitHub request and no
  Durable Object read. The chat summary reads above stay as they are.
- A change of the summary keeps the activity time and the order of the
  row. The [GitHub banner backend](../github/README.md#the-summary-copy)
  writes it, and
  [The GitHub state](../../docs/protocol/github-banner.md#the-github-state)
  states its values.
- A workspace path decodes its workspace ID once.
- An archived workspace keeps its view readable. A view write, a read mark,
  and a lifecycle action other than Restore get `409 workspace_archived`.
- The lifecycle handler reads validated release metadata only for a build or
  refresh. `chatLifecycleRoute` gives the first message
  of a create to `acceptLifecycleFirstMessage` of the workspace object.

Org suspension keeps shell reads available.
The common browser gate refuses every org write except Leave.
The view, read-mark, shared-shell, settings, repository, Archive, and Restore SQL writes also check stored org state, so an earlier permission read cannot admit a later write.

The [secrets backend](../secrets/README.md) stores encrypted org secrets.
Every member can create one. Creator and admin rights guard replacement
and deletion. Only admins set or clear the all-agents mark.
Create, replace, and mark replies return one secret's metadata.
List replies return only metadata. Delete takes an empty JSON object and
returns 204. Replace keeps the value when its value field is empty or absent.
Its description field can replace the description with an empty string.
Each secret write repeats its rights check in SQL.

Every member can read and change a workspace's capabilities.
The capability reply gives `macAccess`, `preapprovedSecretIds`, and
`sessionApprovals`, including the approver and date.
A patch can replace the pre-approved IDs, change Mac access, and remove
named session approvals. A secret ID must belong to the workspace's org.
The stored `macAccess` stays for older pages of older Mac apps. It gates no
Mac request, and a change of it ends no waiting request, as
[Mac access](../../docs/protocol/mac-access.md) says.

The workspace responses give an org-local number and a canonical web link.
They give `restoreUntil` while the workspace row names its archived cloud computer, including while an expired delete retries.
Restore refuses an expired window even when the cloud computer remains.
Each archived workspace with a known Archive date also gets `archivedComputer`: the state of its cloud computer and the original Restore cutoff.
The list and the lifecycle reads take both from [`archived-computer.ts`](../data/archived-computer.ts), in their own query.
So a null `restoreUntil` does not mean that the cloud computer is deleted.
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
- `insertWorkspace` in [`workspace-data.ts`](../lifecycle/workspace-data.ts)
  gives a new workspace the lowest `position` of the active workspaces in
  its section, minus 1. In a section without active workspaces, the new
  workspace takes 0. So it lists first, as the
  [mockups](../../docs/mockups/src/components/workspaces/sections.ts)
  show. A position can be negative.
  [`workspace-insert-data.ts`](../lifecycle/workspace-insert-data.ts) checks
  the parent's depth in the same batch as the insert. It refuses a create
  whose parent moved to the deepest depth after the tool's first check.
- The [app](../../src/app/list-changes.ts) and its
  [dev fake](../../src/app/dev/create-routes.ts) also show a new workspace
  first.
- A workspace move request holds `sectionId` and `position`, the index in
  that section among its top-level rows, without the moved tree. A nested
  row takes no index. The request can omit `sectionId`. Then the move uses the stored
  section of the workspace, inside the transaction. Without `position`,
  the index is 0.
- `writeWorkspaceTree` selects the current top-level rows and descendants
  with recursive SQL inside its D1 batch. The selection follows
  [the shared placement rule](../../src/shared/workspace-tree.ts), including
  archived or queued ancestors and the default section for an unknown section.
  A move writes every descendant's section, including archived descendants.
  `RETURNING` gives the workspace IDs for metadata publication after the batch.
  A section-only move of a nested row changes no placement or activity time.
  A name write still works for a nested row.
  A tool move to the current section also changes nothing, as checked
  inside the batch. `readWorkspaceMove` reads only the tool reply's notice.
- Agent move targets use `writeWorkspaceParentChange` in
  [`workspace-parent-change-data.ts`](workspace-parent-change-data.ts).
  The shared metadata writer waits for a target parent's creation admission.
  The batch checks the target, depth, pending creates, archive state, and
  current membership before it writes. It changes the root parent link,
  each descendant's section, and the top-level places together. A target
  equal to the current place writes nothing. The shared recursive readers
  stop at repeated workspace IDs. [Parent changes](../../docs/protocol/parent-changes.md)
  states the requirements.
- A section move request holds `position`, the index in the section list.
  Each index counts the rows without the moved row.
- A section create request can hold `afterSectionId`. The insert and a
  move in the same batch then put the new section directly below that
  section of the org. The move finds the place from the current rows.
  Without `afterSectionId`, or when that section is gone, the new section
  goes last.
- A move ranks the current rows of its target from an `AS MATERIALIZED`
  snapshot, counting only the selected top-level rows. It then puts the
  moved row at the index. That keyword makes
  SQLite compute the snapshot once, before the update changes a row.
- `markWorkspaceArchived` gives each first live descendant, reached
  through archived rows, the archived workspace's section. These rows,
  oldest first, take consecutive positions from the archived row's position.
  Each other row of that section above that position, live or archived,
  gains the promoted count minus one. With zero or one promoted row,
  no other row changes position. All other stored positions stay.
  `markWorkspaceArchived` selects these descendants inside its Archive batch.
  Its single position write follows Archive and checks `changes()`.
  It runs only when Archive wrote. Promoted top-level rows then keep their
  initial places and can move independently. Restore shows them under
  their nearest live ancestor again.

## Development

Run `npm run test -- worker/app-api worker/chat/integration` from the
repository root. The integration tests use the production Worker entry,
local D1, Durable Objects, and WebSockets, with fake Boat and GitHub.

[App API tests](tests.md) lists the cases and their test helpers.

### Key code

- [`secrets.ts`](secrets.ts) and [`capabilities.ts`](capabilities.ts): org
  secret settings and workspace capabilities, over the [secrets data](../secrets/README.md).

- [`boot.ts`](boot.ts), [`account-data.ts`](account-data.ts),
  [`get-started-data.ts`](get-started-data.ts), and
  [`models.ts`](models.ts): the account, its logins, Get started, and the
  model variables.
- [`shortcuts-data.ts`](shortcuts-data.ts): account shortcut reads and
  atomic batch saves, checked with the shared shortcut readers.
- [`org-agent-logins.ts`](org-agent-logins.ts): member reads and admin
  writes for org logins. Its save, read, and data modules keep discovery,
  public metadata, and guarded SQL separate.
- [`codex-device.ts`](codex-device.ts): the account routes for ChatGPT
  device sign-in, over the [Codex auth service](../codex-auth/README.md).
- [`get-started-github.ts`](get-started-github.ts):
  `getStartedGitHubComplete`, the one owner of the `github-app` step.
- [`shell.ts`](shell.ts) and [`shell-data.ts`](shell-data.ts): the lists of
  an org and the read marks.
- [`workspace-view.ts`](workspace-view.ts): the saved view of each member.
- [`workspace-state.ts`](workspace-state.ts): the state of a workspace for
  its reader, and the refusal of archived writes.
- [`workspace-path.ts`](workspace-path.ts): the workspace ID of a path.
- [`lifecycle.ts`](lifecycle.ts): the lifecycle routes and their options.
- [`continue.ts`](continue.ts): `continueRoute`, which checks the Continue
  request body and gives the start and each poll to the workspace object.
- [`repository-change.ts`](repository-change.ts): `repositoryChangeRoute`,
  which checks the `ChangeRepositoryRequest` body and gives the start and
  each poll to the workspace object.
- [`feature-shell.ts`](feature-shell.ts): shell write dispatch after the
  request gate. [`feature-settings.ts`](feature-settings.ts) encrypts env
  values and their secret marks. Replies return names and marks only.
  [`feature-settings-data.ts`](feature-settings-data.ts) reads and saves
  scripts, the skills source and trust, and encrypted env values.
  [`feature-sections.ts`](feature-sections.ts)
  and [`feature-workspaces.ts`](feature-workspaces.ts) save list changes and
  publish workspace metadata through the workspace object.
  `featureSectionWrite` takes only the request method and the user, org,
  and body of its context. So the
  [agent section calls](../tools/sections-and-previews.md#sections) reuse
  it with the sender as the user.
- [`workspace-metadata.ts`](workspace-metadata.ts):
  `changeWorkspaceMetadata`, the rename and the move of a workspace tree. It
  checks the member and the archive state, runs the section or parent write, and
  publishes the metadata of each moved workspace. `feature-workspaces.ts` and the
  [agent workspace tools](../tools/workspaces.md#rename-and-move) both call
  it. A tool move to the current section of a workspace changes nothing.
- [`shell-guard.ts`](shell-guard.ts): `guardedStatement` inserts the current
  shell member check at each `shellGuard` token and appends its org and user
  bindings. Guarded SQL uses numbered placeholders. `GuardedStatement`
  limits `guardedBatch` and `guardedRun` to statements from the builder.
  `shellRead` prepares a single `SELECT` for reads in the writer files.
- [`workspace-parent-change-data.ts`](workspace-parent-change-data.ts):
  `writeWorkspaceParentChange`, the guarded parent change and tree placement
  in one D1 batch, including creates in flight under the moved tree.
- [`feature-workspaces-data.ts`](feature-workspaces-data.ts):
  `readWorkspaceTree` and `readWorkspaceMove` read the org's tree and its
  shown places for reads and notices. `updateShellWorkspace` prepares the
  guarded metadata write. `writeWorkspaceTree` saves tree moves in one D1
  batch, with current membership and places.
  [`archive-data.ts`](archive-data.ts) keeps Archive, descendant promotion,
  and token revocation in one batch with its owner-or-admin access check.
  [`feature-sections-data.ts`](feature-sections-data.ts): the
  section writes `insertShellSection`, `updateShellSection`, and
  `deleteShellSection`. [List order](#list-order) gives their rules.
- [`feature-github.ts`](feature-github.ts): account installations and
  repositories read with the fresh GitHub user token.
  [`feature-org.ts`](feature-org.ts) creates an org with its chosen
  repositories and starts its first build with `startImageBuild` of the
  [image lifecycle](../lifecycle/image-builds.md).
  [`feature-repositories.ts`](feature-repositories.ts) merges
  the org's saved choices with repositories that its reader can access,
  gives each its `imageReady` and `ready` from
  `currentImageRepositoryReadiness` of the
  [published image data](../lifecycle/published-image-data.ts), and
  starts a build after an add without `build: false`.
  Their `*-data.ts` files keep queries and guarded writes.
- [`feature-skills.ts`](feature-skills.ts) checks membership and the saved
  name. [`skills-github.ts`](skills-github.ts) reads only the repository
  record and recursive default-branch tree, with the viewer's fresh user token.
- [`feedback.ts`](feedback.ts), [`feedback-input.ts`](feedback-input.ts),
  [`feedback-data.ts`](feedback-data.ts),
  [`feedback-mail.ts`](feedback-mail.ts), and
  [`feedback-quota-data.ts`](feedback-quota-data.ts): the feedback routes,
  the checked body, the reply email and reachable IDs, the email, and the
  send limit.
  [Feedback routes](feedback.md#key-code) gives each entry point.

### Branch lists

The branch list uses [the shared branch contract](../../src/shared/branches.ts).
It returns only branches that GitHub lists, newest commit first.
It follows all GitHub pages. An empty repository returns an empty list.
The browser adds its default row from the saved repository record and filters the list for search.
The route checks org membership and the org's repository before and after the read.
It stores no branch list and returns no GitHub token or upstream error text.
Missing GitHub access returns `github_access_required`; a failed read returns `github_unavailable`.
[`branch-query.ts`](../github/branch-query.ts) checks repository identity and maps those errors.

### Related docs

- [Worker backend](../README.md)
- [Workspace lifecycle](../lifecycle/README.md#browser-routes)
- [Deployment inputs](../../docs/deployment.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md)
- [Feedback](../../docs/protocol/feedback.md)
- [Shared contracts](../../src/shared/README.md)
