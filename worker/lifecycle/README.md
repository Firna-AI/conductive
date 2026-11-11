# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace is one task with its own branch
and its own Boat sandbox. The code reaches Boat only through the
`SandboxProvider` interface in [`provider.ts`](../sandbox/provider.ts),
with the client of the provider account that each record stores.
[Provider accounts](provider-accounts.md) and the
[sandbox area](../sandbox/README.md) say how.

`chatLifecycleRoute` in [`worker/app-api/lifecycle.ts`](../app-api/lifecycle.ts)
gives the create, read, resume, and activity routes of a workspace to
`handleLifecycleRequest`. The root Worker also serves the
[machine route](#machine-route), image builds, refreshes, and build log streams.

## Responsibilities

- Build and refresh the org image in a separate build sandbox, with a build
  history and a live build log.
- Create a workspace from the newest good org image.
- Keep the state of each workspace in its Durable Object: the starts, the
  activity, the idle stop, and the disk retention restart. That restart
  starts a stopped sandbox briefly, so that Boat keeps its disk.
- Update the app's own software on the disk of a workspace with an older
  version at each workspace start. The restart of an archived sandbox
  updates nothing. [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces)
  states the rules.
- Stop and retain archived sandboxes, and delete them after the Restore window.
- Repair overdue disk, archive, and image alarms from the 15-minute Cron Trigger.
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn.
- Give the GitHub CLI the workspace owner's token outside an agent turn.

## Integration points

### Browser routes

[Browser routes](routes.md#browser-routes) gives the routes that
`handleLifecycleRequest` serves, the options of its caller, and the rules
of a create.

The internal `createWorkspace` call can pass a base branch and a start commit separately from the browser request.
Its provider account argument selects the published org image independently of those branch fields.
The creation claim keeps them in its saved plan.
The fetch updates `refs/remotes/origin/<base branch>`.
The branch phase uses the event commit when it exists, or the fetched head otherwise.
It sets the branch's `gh-merge-base` Git setting to the workspace base.
Create, resume, and disk retention pass that base through `CONDUCTIVE_DEFAULT_BRANCH`.
A null stored base uses the repository default branch.

### Input activity

[Input activity](routes.md#input-activity) gives how one
`InputActivityOwner` in each workspace object takes the input of the
browser and of previews. Terminal frames report no activity.

### Machine route

[Machine route](routes.md#machine-route) gives `handleGitCredential`, the
git credential route on the machine hostname, the git credential sender,
and how `createApp` routes it.

### Workspace Durable Object

[Workspace Durable Object](workspace-object.md) describes the Durable
Object of each workspace and of each image coordinator. It gives their
names, the lifecycle steps, the alarm, the start logs, the event socket,
and the publication of the events. It also gives the creates and resumes.
[Turn recovery and the shown state](recovery-and-shown-state.md) gives the
turn repair from the committed chat and the one writer of the shown state.

### Builds and refreshes

[Image builds](image-builds.md) describes build sandboxes, the runner version of an image, suspension,
provider retries, logs, snapshot leases, and refresh timers.
The [software image area](../software-image/README.md) builds the shared
image that each build and refresh uses when a matching version is ready.
Each job copies its repositories into fresh folders and runs its install
script. An empty script skips the install step and its log entry.
Refreshes keep the repositories, folders, and install script of the newest
successful build. Saved script changes wait for a build.

## Settings

[Lifecycle settings](settings.md) gives the environment inputs and captured secret values.

## Provider accounts

[Provider accounts](provider-accounts.md) gives the provider account that
each record and start job stores, the client that each call uses, and the
[org image of each account](provider-accounts.md#org-images).

## Development

Run `npm run test -- worker/lifecycle` from the repository root with Node 24.
The [lifecycle test guide](tests.md) describes the native fixture, clocks, alarms, and focused checks.

D1 holds the workspace, token, build, and log records. The storage of each
object holds the lifecycle state, the turn records, and the events.
The computer ledger keeps allocation keys, orgs, owners or starters, and provider IDs with their [provider accounts](provider-accounts.md#the-computer-ledger).
It keeps deleted computer IDs until their org is purged.
Assigned identity writes also retain older IDs, including imports and repairs.
Workspace owner changes update each live ledger entry of that workspace.
The retained owner survives removal of the workspace row.
Allocation recovery keeps that retained owner when it merges an imported computer.
Definite first create refusals stay as rejected allocation records.
A refused replay keeps an earlier uncertain request live.
Each failed computer has its own cleanup flag.
The native cleanup pointer can therefore change without losing an older failed computer.
Archive and Restore keep the ledger entry of a retained computer live.
At the end of Restore, the delete goes through the ledger-aware cleanup of [`cleanup.ts`](cleanup.ts).
`detachArchiveDisk` then marks the exact account and ID deleted in the same D1 batch that detaches the disk.
A confirmed missing archived disk uses that batch too.

### Key Code

[Lifecycle key code](key-code.md) names the files, the types, and the
functions of the lifecycle that a reader opens first.

- [build-admission-data.ts](build-admission-data.ts): `insertBuild` pins the
  software version and install script revision in the job. `publishBuild`
  copies them to the published build in the same D1 batch as the org image
  pointer. Builds and refreshes record the current software and runner
  versions. A refresh keeps the script revision of the newest good build.
- [image-records.ts](image-records.ts): `installScriptRevision` hashes the
  exact saved script text. Its types add `refreshCause` to build history
  and build responses. New refreshes record `push`, `daily`, or `request`
  at admission. Builds and older refreshes keep a null cause.
- [org-image-data.ts](org-image-data.ts): `readOrgImage` reads the version
  and script revision from the published build of that provider account.
- [start-allocation.ts](start-allocation.ts): `allocateWorkspace` records
  the allocated snapshot's build and versions before the provider request.
  A newer org image cannot change those records. A retained computer keeps
  its records.
- [workspace-software-data.ts](workspace-software-data.ts):
  `readWorkspaceImageRecords` reads the workspace's software version,
  starting image build, install script revision, and failed update mark.
  `workspaceSoftwareIsOlder` treats a different or missing version as old.
  Versions are content digests, so they have no time order.
  `workspaceInstallScriptDiffers` compares the workspace script revision
  with the current org image in its provider account. A new image with the
  same script does not change the result.
  `recordWorkspaceSoftwareVersion` records a good software update and clears
  the failed update mark. `recordWorkspaceSoftwareUpdateFailed` sets or
  clears that mark without changing the version. It stays set until a
  caller clears it at the next start or records a good software update.
  `recordWorkspaceInstallScriptRevision` records a good install script run
  without changing the software version or the starting image build.
- [workspace-software-update.ts](workspace-software-update.ts): the update
  that creates, resumes, and the disk retention restart share.
  - `prepareWorkspaceSoftwareUpdate` compares the recorded version with the
    current version, which `softwareVersion` computes from the configured
    runner archive. It returns no update for current software. For an older
    or missing version, it returns the archive, the version, and the
    command for the caller to pin. Without valid archive settings, it
    returns an update that fails at once.
  - `softwareUpdateOutcome` reads the end of the update command. A failed
    restore of the earlier files, or a lost command, fails the start.
  - `recordSoftwareUpdateOutcome` records the version or sets the failed
    update mark.
- [start-software-command.ts](start-software-command.ts):
  `workspaceSoftwareUpdateCommand` runs the shared `softwareInstallCommand`
  from [install-command.ts](../software-image/install-command.ts).
  `softwareVersion` hashes that exact command, including its initial
  `set -eu` before the tools install. After a
  good install, it starts the relay socket and restarts the relay service,
  so the current relay runs at once. The image installers still start no
  unit. The command saves the earlier app files first. A failed backup
  keeps those files and removes temporary files. A failed install restores
  the earlier files.
- [start-machine.ts](start-machine.ts): after provider readiness,
  `advanceStartMachine` asks for an update. With one, the start enters its
  `software` phase before the fetch step of a create or the startup step of
  a resume. The start job keeps the pinned update in `softwareUpdate`. So a
  restart of the object or a new archive setting does not change that
  update.
- [start-progress.ts](start-progress.ts): `advanceStartSteps` shows that
  phase as "Updating the agent and terminal software", the label of
  `stepLabel` in [start-step-label.ts](start-step-label.ts). After a failed
  update, the step shows as failed, and the start goes on with the old
  software. The 20-minute start limit covers the update, so a hung update
  fails the start.
- [start-admission.ts](start-admission.ts): `enqueueWorkspaceStart` clears
  the failed update mark when it admits a start.
- [workspace-data.ts](workspace-data.ts): `workspaceRecord` reads the failed
  update mark of the D1 row into `softwareUpdateFailed`. `workspaceView`
  keeps that field. These queries select the mark: `readWorkspace`, the
  workspace list query in [shell-data.ts](../app-api/shell-data.ts), and
  `readDeviceWorkspace` in [data.ts](../devices/data.ts) for the
  device-only fallback. So the workspace list, each workspace detail
  reply, and each `workspace.updated` event carry the mark. A row that a
  query reads without the mark gives no value, never false. Replies give
  the mark only in that field. The shared `Workspace` type in
  `src/shared/` does not name it yet.
- [workspace-response.ts](workspace-response.ts):
  `presentProvisionedWorkspace` reads the current mark for a repeated
  create, because the saved create reply can hold an older value.
- [durable-journal.ts](durable-journal.ts): `WorkspaceEventJournal` compares
  public event data, so a warning change reaches open tabs even when the
  workspace state stays unchanged. Timestamp-only polls remain suppressed.
- [disk-retention.ts](disk-retention.ts): `keepWorkspaceDisk` clears the
  failed update mark when a restart near day 14 of a stop begins. After
  Boat reports the sandbox ready, it pins the same update before the
  retention startup script. The workspace stays stopped, and no runner
  starts.
- [retention-software.ts](retention-software.ts): `advanceRetentionSoftware`
  runs that pinned update. It resumes the saved process after a restart of
  the object. After a failed update, the restart goes on to its
  startup script. A failed restore, a lost command, or the 20-minute limit
  stops the restart with an error, before the startup script.
- [disk-retention-state.ts](disk-retention-state.ts): the `softwareStep`
  hook of `RetentionCommandPort` writes the update step, after a completed
  resume step, into the start steps of the stopped workspace. A restart
  that ends while the step runs marks the step failed.
- [archive-maintenance.ts](archive-maintenance.ts): the restart of an
  archived sandbox reads no archive setting and runs no update. It keeps
  the recorded version and the failed update mark.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image. [Life of a workspace](../../docs/protocol/workspace-life.md)
  gives the start steps, the updates of an old workspace, stop and resume,
  Archive, and Restore.
- [Access and security](../../docs/protocol/access-and-security.md): what a
  sandbox holds, the workspace token, and GitHub tokens.
- [Architecture](../../docs/architecture/components.md): the Worker, the workspace
  Durable Object, and Boat.
- [Sandbox software](../../image/README.md): the software that each org
  image holds.
- [Shared contracts](../../src/shared/README.md): the browser and runner
  payloads.
- [Migrations](../../migrations/README.md): the D1 tables.
- [Operator actions](../operator/README.md#lifecycle-checks): the suspension checks.
