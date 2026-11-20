# Workspace lifecycle

This folder holds the Worker code that prepares the org image and runs the
life of each workspace. The org image is the saved snapshot that every new
sandbox of an org starts from. A workspace has its own sandbox and one
branch at a time. [Continue](continue.md) moves it to a new branch after
its merge. A [repository change](repository-change.md) moves it to a new
branch of another repository of the org, in the same sandbox. The code reaches its provider only through the
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
  starts a stopped Boat sandbox briefly, so that Boat keeps its disk.
  Other provider kinds get no disk retention restart.
- Stop and retain archived sandboxes, and delete them after the Restore window.
- Repair overdue disk, archive, and image alarms from the 15-minute Cron Trigger.
- Repair the running turns, the idle time, and the name of a workspace
  from its committed chat, when a hook or a restart lost an update.
- Give the git credential helper a fresh GitHub user token of the sender of
  the current turn, of the member who pressed Continue or changed the
  repository during the fetch of that job, or of the workspace owner
  during a saved base-move fetch.
- Continue a workspace on a new branch after its merge, with the same
  sandbox and sessions.
- Change the repository of a workspace to another repository that its
  sandbox holds, with the same sandbox and sessions.
- Restart the runner, preview relay, and terminal service of a running workspace, after
  an update check, as [Restart](routes.md#restart) says.
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
The create reads the fixed org account, and that account selects the published org image independently of those branch fields.
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

The browser create takes optional workspace capabilities.
`request-parser.ts` reads the pre-approved secret IDs and Mac access.
`create-request.ts` checks that the selected secrets belong to the org.
`creation-plan-statements.ts` saves these choices, and `creation-claims.ts`
reads them for each retry. `workspace-data.ts` writes Mac access and the
pre-approvals with the workspace records in one D1 batch.
An omitted choice gives no pre-approval and leaves Mac access off.
The [secrets backend](../secrets/README.md) owns the capability data.

### Input activity

[Input activity](routes.md#input-activity) gives how one
`InputActivityOwner` in each workspace object takes the input of the
browser. Previews and terminal frames report no activity.

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
A pending Continue or repository change defers the move, so two operations cannot change the target together.
No token or provider output enters the saved job, command, logs, or reply.
[Native Git tests](base-change-native.test.ts) check merge-base comparisons after a merge commit and a refused fetch.
[Native workspace tests](../features/base-moved.test.ts) check D1 repair, retries, hibernation, and resume.
[Credential tests](../features/base-moved-credentials.test.ts) check the owner scope and secret handling.
### Repository change

[Repository change](repository-change.md) gives the routes and errors, the
admission and the reservation that it shares with Continue, its phases,
the move command with the context copy, the publication, and the
recovery. [`workspace-jobs.ts`](workspace-jobs.ts) owns both jobs for the
workspace object.

### Builds and refreshes

[Image builds](image-builds.md) describes build sandboxes, the runner version of an image, suspension,
provider retries, logs, snapshot leases, and refresh timers.
The [software image area](../software-image/README.md) builds the shared
image that a build of an org without an org image starts from.

Org builds and refreshes install the newest sandbox release through `conductive`.
A first build from a software image runs this step too.
The step runs apt only when the source image lacks the current apt part or
a package, or when its ttyd service is not masked, as
[The software step](image-builds.md#the-software-step) says.
An image that holds `conductive` updates through that program.
Refreshes then snapshot without running the org install script.
The Worker validates release metadata from `CONDUCTIVE_RELEASE_SERVER`,
which defaults to `https://runner.conductive.build`.
A failed build lookup fails the build. A failed startup lookup prints a warning.

A normal workspace startup bootstraps a missing program in a detached root job.
Downloads never hold the lock used by runner restarts.
Activation shares `/run/conductive/bootstrap-activate.lock` with the restart.
The first activation confirms its installation before it releases that lock.
Restart applies a complete download in the runner's pre-start step under
the same lock. It then restarts the relay and ttyd, with no restart of the
terminal shell server. A terminal restart or support check failure warns
and keeps Restart successful. The workspace object reads the terminal
password and support again for the captured sandbox and provider account.
A failed read keeps its cache. Changed support commits one terminal list
event with the new value, through the workspace event sequence.
The release program includes the workspace CLI and MCP server.
Its system installer links `/usr/local/bin/conductive` to the active program.
Disk retention starts do not bootstrap or restart the runner.
[Installation](../../image/install.md) gives the command sequence and release layout.

## Settings

[Lifecycle settings](settings.md) gives the environment inputs and captured secret values.

## The stop time

The operator saves the stop time of idle sandboxes on the Settings tab, as
[Stop and resume](../../docs/protocol/stop-and-resume.md#the-stop) says.
[`idle-stop.ts`](idle-stop.ts) reads it from the `idle_stop_settings` row.

- Each workspace object reads it through the `idleMs` hook and keeps it for
  60 seconds. A failed read keeps the last value, or 30 minutes before the
  first read.
- The alarm and its schedule use it for the idle stop. `idleMs` is a
  required hook, so no lifecycle can drop the setting.
- When the alarm fires before the stop time ends, at least 15 minutes after
  the last activity, with the runner connected and no restore watch due, it
  extends the provider auto-stop. So a longer stop time reaches a running
  sandbox before its old provider auto-stop ends.
- Each workspace create, resume, and auto-stop call sets the provider
  auto-stop to the stop time plus 60 seconds, from
  `workspaceAutoStopSeconds`. When the read fails, it uses the longest
  choice, so that the provider never stops a sandbox early.
- Image builds and the disk retention restarts keep 1,800 seconds.

## Provider accounts

[Provider accounts](provider-accounts.md) gives the provider account that
each record and start job stores, the client that each call uses, and the
[org image of each account](provider-accounts.md#org-images).

## Development

Run `npm run test -- worker/lifecycle` from the repository root with Node 24.
The [lifecycle test guide](tests.md) describes the native fixture, clocks, alarms, and focused checks.

`WorkspaceStateProjection` passes the lifecycle start to `persistLifecycleState`
in [`workspace-data.ts`](workspace-data.ts).
The save copies `start.startedAt` into `workspaces.running_since` for starting,
ready, working, unread, and input. A missing start writes null.
Stopped, error, and archived states clear the time.
Archive, Restore, and deleted-org stops also clear it in their direct D1 writes.
A deleted-org disk restart saves its restart time.
The [operator Overview](../operator/overview.md) reads this current run time without a provider call.
The migration leaves existing times null until their next lifecycle save.
The save runs within 5 minutes during a turn, and within the stop time otherwise.

The [provider accounts page](provider-accounts.md#the-computer-ledger) describes
the persisted resource records and the retained computer ledger.

### Key Code

- [software-release.ts](software-release.ts): reads and validates the newest release JSON.
- [software-bootstrap.ts](software-bootstrap.ts): verifies downloads and serializes first activation with runner restarts.
- [software-restart.ts](software-restart.ts): checks for updates, restarts the running services, and asks the workspace object to refresh terminal support.

[Key code](key-code.md) lists the entry points of the lifecycle code, and
the guides that give the entry points of each part.

### Related Docs

- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  the org image. [Life of a workspace](../../docs/protocol/workspace-life.md)
  gives the start steps, stop and resume, Archive, and Restore.
- [Access and security](../../docs/protocol/access-and-security.md): what a
  sandbox holds, the workspace token, and GitHub tokens.
- [Architecture](../../docs/architecture/components.md): the Worker, the workspace
  Durable Object, and the sandbox providers.
- [Sandbox software](../../image/README.md): the software that each build
  installs.
- [Shared contracts](../../src/shared/README.md): the browser and runner
  payloads.
- [Migrations](../../migrations/README.md): the D1 tables.
- [Operator actions](../operator/README.md#lifecycle-checks): the suspension checks.
