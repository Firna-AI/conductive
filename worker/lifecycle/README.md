# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace has its own Boat sandbox and one
branch at a time. [Continue](continue.md) moves it to a new branch after
its merge. The code reaches Boat only through the
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
- Stop and retain archived sandboxes, and delete them after the Restore window.
- Repair overdue disk, archive, and image alarms from the 15-minute Cron Trigger.
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn, of the member who pressed Continue during its fetch,
  or of the workspace owner during a saved base-move fetch.
- Continue a workspace on a new branch after its merge, with the same
  sandbox and sessions.
- Give the GitHub CLI the workspace owner's token outside an agent turn.

## Integration points

### Browser routes

[Browser routes](routes.md#browser-routes) gives the routes that
`handleLifecycleRequest` serves, the options of its caller, and the rules
of a create.

The browser create accepts optional `startBranch` and `baseBranch` fields.
[`create-branches.ts`](create-branches.ts) applies their defaults before creation.
It checks each named non-default branch with the sender's fresh GitHub user token.
The shared check in [`branch-check.ts`](../github/branch-check.ts) distinguishes a missing branch from missing repository access.
It keeps the create's published-image repository policy when the current selection changes.
A failed GitHub read or expired sign-in leaves the start to decide.
Creation replays run before this check and keep the original branch choices.
The internal `createWorkspace` call can pass a pull request base and start commit separately from those fields.
Its provider account argument selects the published org image independently of those branch fields.
The creation claim keeps both branches and the start commit in its saved plan.
It applies omitted defaults against the same publication that supplies the leased image.
Named fields keep their values if publication changes before admission.
A base equal to the repository default stays null in storage.
The fetch updates remote-tracking refs for both the start and base branches.
The branch phase uses the event commit when it exists, or the start branch's explicit remote ref otherwise.
It sets the branch's `gh-merge-base` Git setting to the workspace base.
Create, resume, and disk retention pass that base through `CONDUCTIVE_DEFAULT_BRANCH`.
A null stored base uses the repository default branch.
Each startup command tries to set `gh-merge-base` and `origin/HEAD` from the current stored base before the startup script and runner run.
The metadata command does not depend on the current HEAD, and a failed update does not block startup.
It leaves both settings unchanged when the new base has no remote-tracking reference.
An unfinished deleted-base move uses [the saved move job](#moved-bases) before startup.
That startup skips its ordinary metadata command, so it cannot apply an unfinished move before the fetch.
Try again keeps the saved start and base branches with its new allocation.

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

### Continue

[Continue](continue.md) gives the admission and reservation of Continue,
its phases, the staged fetch and the branch move, the publication, and the
recovery. [Continue routes](continue-routes.md) gives its routes and errors.
[The git credential sender](git-credentials.md#continue) gives the grant
of its fetch.

### Moved bases

`WorkspaceBaseChanges` in [`workspace-base.ts`](workspace-base.ts) owns each deleted-base move.
[`saveBaseChangeJob`](base-change-job.ts) saves one `baseChange:job` with the GitHub snapshot marker and alarm source.
[`baseChangeChatStorage`](base-change-storage.ts) registers the native alarm in that same transaction.
The job repairs D1 before it changes the cloud computer.
It retains the same job ID after a D1 failure, a cloud failure, or object hibernation.
Its retry delay starts at one second, doubles after each failure, and stops growing at 15 minutes.
A stopped computer keeps the job until it can run again.
Each resume attempts the same job before startup, even when its retry time is later.
A failed attempt leaves the job and does not fail the resume.

[`base-change-commands.ts`](base-change-commands.ts) shares the isolated fetch and reference installation with Continue.
The fetch uses a bare stage outside the working repository.
Only that fetch exports the trusted job ID for the credential helper.
`credentialSender` maps that ID to the current workspace owner only while the fetch request runs.
It rechecks the org, owner, repository, branch, sandbox ID, and provider account.
A rebuilt object has no credential scope.
An owner who cannot read the repository leaves the fetch pending under the same retry.

The install command imports staged objects without a credential.
It updates `refs/remotes/origin/<base>` before `gh-merge-base` and `origin/HEAD`.
The missing-ref guard keeps both settings when the reference is absent.
The install keeps HEAD, the workspace branch, the index, and local files.
A pending Continue defers the move, so the two operations cannot change the target together.
No token or provider output enters the saved job, command, logs, or reply.
[Native Git tests](base-change-native.test.ts) check merge-base comparisons after a merge commit and a refused fetch.
[Native workspace tests](../features/base-moved.test.ts) check D1 repair, retries, hibernation, and resume.
[Credential tests](../features/base-moved-credentials.test.ts) check the owner scope and secret handling.

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

[Key code](key-code.md) lists the entry points of the lifecycle code, and
the guides that give the entry points of each part.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image. [Life of a workspace](../../docs/protocol/workspace-life.md)
  gives the start steps, stop and resume, Archive, and Restore.
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
