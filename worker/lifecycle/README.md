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
`handleLifecycleRequest`. It serves the Activate route of an imported
workspace itself, as [Import activation](#import-activation) says. The root
Worker also serves the [machine route](#machine-route), image builds,
refreshes, and build log streams.

## Responsibilities

- Build and refresh the org image in a separate build sandbox, with a build
  history and a live build log.
- Create a workspace from the newest good org image.
- Activate an imported workspace: restore its stored work from the import
  area in a new cloud computer, with no first message.
- Keep the state of each workspace in its Durable Object: the starts, the
  activity, the idle stop, and the disk retention restart. That restart
  starts a stopped sandbox briefly, so that Boat keeps its disk.
- Stop and retain archived sandboxes, and delete them after the Restore window.
- Repair overdue disk, archive, and image alarms from the 15-minute Cron Trigger.
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn. During the restore of an activation, give it the token
  of the activator.
- Give the GitHub CLI the workspace owner's token outside an agent turn.

## Integration points

### Browser routes

[Browser routes](routes.md#browser-routes) gives the routes that
`handleLifecycleRequest` serves, the options of its caller, and the rules
of a create.

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

### Import activation

[Import activation](import-activation.md) gives the Activate route, the
separate image lease, the attempt fence, the phases and their runner
commands, the held messages, the work cleanup after success, and the
interrupted attempts.

### Builds and refreshes

[Image builds](image-builds.md) describes build sandboxes, the runner version of an image, suspension,
provider retries, logs, snapshot leases, and refresh timers.
The [software image area](../software-image/README.md) builds the shared
image that a build of an org without an org image starts from.

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

The [lifecycle code map](code-map.md) lists the lifecycle entry points.

The trusted [import record writer](../conductor-import/workspace-data.ts)
publishes a verified imported workspace without a cloud computer or first chat identity.
It writes the runtime session, turn, and message IDs as null.
The activation later saves the early session as the runtime session. The first turn and message IDs can stay null, and an activated import still resumes.
The list and read projections preserve `inactive` and its import origin.
Normal create admission still requires every first-message ID.

[create-request.ts](create-request.ts) chooses the branch of a new workspace.
The [shared branch contract](../../src/shared/workspace-branches.ts) permits
New branch or an existing branch. Omission keeps New branch.
The saved creation plan keeps that mode across admission and retry.
[start-command.ts](start-command.ts) selects the Git commands.
[existing-branch-command.ts](existing-branch-command.ts) fetches the exact
remote ref and checks it out with tracking. A missing branch gets its own
start failure. Transport and authentication failures keep the general failure.
The native new-branch path still uses [default-branch-command.ts](default-branch-command.ts),
including its empty-repository initialization.
[Continue a branch](../../docs/protocol/continue-a-branch.md) states the requirements.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image. [Life of a workspace](../../docs/protocol/workspace-life.md)
  gives the start steps, stop and resume, Archive, and Restore.
- [Imported workspaces](../../docs/protocol/imported-workspaces.md): the
  activation of a workspace from Conductor.
- [Access and security](../../docs/protocol/access-and-security.md): what a
  sandbox holds, the workspace token, and GitHub tokens.
- [Architecture](../../docs/architecture/components.md): the Worker, the workspace
  Durable Object, and Boat.
- [Sandbox software](../../image/README.md): the software that each build
  installs.
- [Shared contracts](../../src/shared/README.md): the browser and runner
  payloads.
- [Migrations](../../migrations/README.md): the D1 tables.
- [Operator actions](../operator/README.md#lifecycle-checks): the suspension checks.
