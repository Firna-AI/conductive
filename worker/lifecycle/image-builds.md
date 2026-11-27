# Image builds

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code builds and refreshes the org image. The org image is
the saved snapshot that every new sandbox of an org starts from. It also
gives the provider retry policy that builds, refreshes, and workspace
starts share. [Build sandboxes](#build-sandboxes) describes their starting
image and the clone token of each copy. [Key code](#key-code) names the
files of the image code.

## Build sandboxes

- An ordinary build sandbox starts from the current org image. A first build uses a
  matching ready software image, or a new default sandbox without one.
  A hidden switch build uses the same first-build path on its target
  account. It never starts from an older image of the org there.
  Its env holds only the folder variables.
- Risk: a program with root access that an earlier install left in that
  image can read the clone token of a later copy. That token can only read
  its own repository, which the image already holds. The Worker revokes it
  when the copy ends, as
  [GitHub tokens](../../docs/protocol/tokens-and-secrets.md#github-tokens)
  says.
- Repository copies use the [shared GitHub App credential flow](../github/app-credentials.ts).
  The [source loader](repository-layout.md#the-source-loader) gives the token and revocation steps.

The [operator backend](../operator/README.md#suspend-an-org) can suspend an org.
Every start and build phase checks this with user suspension.
Guarded admission, publication, token replacement, source grants, and refresh claims also check stored org state.
Cleanup can still recover uncertain allocations and remove resources.
A pending start, outcome publication, or failed-computer cleanup keeps suspension pending and its native alarm armed.
Suspended orgs get no disk retention restart, including after an owner change.

## Runner version

- Each full build and refresh records the Worker's runner protocol version.
  Both install the newest sandbox release.
- Each new computer allocation stores the runner version of its image snapshot before the provider call.
  This includes a first start, Try again, and a restored allocation.
  A missing image version counts as version 1.
  The chat backend still accepts only the supported runner version, whatever this pin, as [Runner versions](../../docs/protocol/version-pins.md#runner-versions) says.

## Build jobs

`startImageBuild` in [`image-builds.ts`](image-builds.ts) records a build or
refresh for an org admin and returns its ID. A request during a job gets
its ID and schedules it again. During a hidden switch build, it records
a waiting member build instead. [Provider switches](provider-switches.md)
gives the queue, execution deadline, and input capture. Each alarm advances the job one step with
`advanceBuildStep` in [`image-build-steps.ts`](image-build-steps.ts).
Software and install commands run detached and stream their output.
The software release includes the workspace CLI and MCP server.
Builds need no separate tool source installation.
D1 stores the step, output offsets, and log. Each row holds at most
256 KiB of UTF-8 text, split between complete characters.

`createShellOrg` in [`feature-org.ts`](../app-api/feature-org.ts) starts the
first build after it saves the org and its repositories. A new build whose
first alarm cannot schedule fails at once with a saved message. A build
that has not allocated a sandbox ends without cleanup. An allocation
already in progress keeps its cleanup ownership. A failed reschedule of
an existing running build keeps that build running.

`changeShellRepository` in
[`feature-repositories.ts`](../app-api/feature-repositories.ts) starts a
build after a save adds a repository, unless the save says
`build: false`. The app sends that body, and Done of the Repositories tab
then starts one build through the builds route. An add without the
field, from an older copy of the app, builds at once. The build uses the
admin who added the repository, also after a failed build. A repeated
save and a removal start no build.
A failed start keeps the saved choice and writes one fixed warning.

`publishBuild` in [`build-admission-data.ts`](build-admission-data.ts)
records whether the first good build needs an added build for changed
settings. A successful build or refresh also gets an added build when its
repositories lack a chosen repository and the newest build succeeded.
Its `cleanup-build` phase keeps that work through coordinator
reconstruction. `cleanupBuild` in [`build-execution.ts`](build-execution.ts)
finishes resource cleanup before `startFollowingBuild` in
[`first-image-build.ts`](first-image-build.ts) starts the added build.
The added build uses the first admin who is not suspended. A failed start
keeps the published image and writes one fixed warning. A failed build
starts no added build. A refresh after a failed build gets none either.

Build computer, Try again, and Done pass `requested: true` to `startImageBuild`.
During a refresh, `requestBuildAfterRefresh` in
[`build-request.ts`](build-request.ts) saves the admin in
`image_build_jobs.requested_build_user_id`, only while the refresh runs.
When the refresh ended after the first read, the click starts the build at
once. `startFollowingBuild` in [`first-image-build.ts`](first-image-build.ts)
runs where a job becomes `done`: at the end of `cleanupBuild`, and in the
failure path without a provider. It takes the request once and starts the
build for that admin, else the added build. A failed start writes the
`requested_image_build_start_failed` warning. A new build that is not a
switch build clears each saved request of the org in its insert batch, in
`insertBuild` of [`build-admission-data.ts`](build-admission-data.ts), so a
refresh that ends later starts no second build. The build readers return
`buildRequested: true` for a running refresh with a request.

A job that fails while the image coordinator advances it writes the
`image_build_failed` warning, in `handleImageBuildFailure` of
[`image-build-failure.ts`](image-build-failure.ts). Other paths that fail a
build, such as a job that could not be scheduled, write none. When the job fails
in the `sources` phase, the warning adds `sourceStep`, the fixed step of the
repository load that failed, and `githubStatus`, the HTTP status of a GitHub
reply that was not OK, or null. [`image-sources/failure.ts`](image-sources/failure.ts)
gives the steps. A step that the code does not know gives `unknown`. The
warning holds no token, no repository name, and no response text.

`readBuildHistory` in [`build-data.ts`](build-data.ts) returns
`BuildsResponse.changes` with the build history. It excludes operator
switch builds. A hidden published image points the member reply at the
newest visible successful build. A normal published pointer stays unchanged.
`readBuildSnapshot` excludes hidden rows from both its header and its log
query, so direct reads and streams expose neither a hidden build nor its log. `readBuildChanges` in
[`build-changes-data.ts`](build-changes-data.ts) compares the raw saved
install script with the newest successful build's script in the requested
provider account. Before that account's first image, it uses the newest
build in the same account, in any state. A refresh never becomes this
script reference. The added and removed repository lists compare the
chosen repositories with that account's published image. Both lists stay
empty before the first image.

D1 keeps at most 4 MiB of each build log: the first and the last output.
A write that passes that budget removes whole rows from the middle.
The line `[N output bytes omitted]` takes their place in the event order.

Each step writes a heading line to the log: the repository copies, the
software command, and the install script. The snapshot step writes
`SNAPSHOT_START_LOG` from [`build-command-data.ts`](build-command-data.ts)
in the same D1 batch as the new snapshot name, before the provider call.
It writes `SNAPSHOT_DONE_LOG` in the same batch as the change to the
`publish` phase. So a retry or a replayed save repeats neither line.

`failBuild` in [`build-data.ts`](build-data.ts) and `publishBuild` in
[`build-admission-data.ts`](build-admission-data.ts) end a build through
one [shared writer](build-end-data.ts). A failure saves the failed state,
the failure message, and its log line. A publication saves the succeeded
state, the org image, and the `cleanup` or `cleanup-build` phase. The writer
saves each end in one D1 batch. It saves an end only for the call that
changes a `running` build to `failed` or `succeeded`. A publication also
needs an active org.

So a scheduling failure that arrives after an alarm ended the build does
not change the state, the saved message, or the log. A publication that
runs after a failure ended the build does not change the state, the org
image, or the phase. Cleanup then deletes the snapshot of the failed
build. Other log writes do not check the build state. So output can still
reach the log during cleanup.

The phase write of each step before publication does not check the build
state. So a step that an alarm already runs can save a later phase after a
scheduling failure ended the build. That write can replace the phase that
the failure chose: `allocating`, `cleanup`, or `done`. `pendingImageCleanup`
in [`image-maintenance-data.ts`](image-maintenance-data.ts) selects a build
for cleanup when its state is `failed` or `succeeded` and its job phase is
not `done`. So that build keeps its cleanup ownership, whatever phase the
step saved.

- A build loads the chosen repositories, installs the image software, runs
  the install script with Bash, and saves a snapshot. A first build that
  pins a matching ready software image of its own account starts from it
  and still installs the newest release. A first build in an account with
  no such image, such as `e2b`, installs the software on the provider base
  of that account. Admission records the pin in the job insert. The pin stays
  until the job reaches `done`, including its cleanup. The
  [software image backend](../software-image/README.md) owns these images.
  A refresh loads the repositories of the current image again, installs
  the newest release, clears its command journal, and saves a snapshot.
  It does not run the org install script.
- The org image changes only when the new snapshot is ready. Each job
  deletes every live ledger computer of that org and build, and keeps its history and log.
  A failed Delete keeps cleanup scheduled until each computer is removed.
  Cleanup attempts every live computer even when another Delete fails.
  It reports that failure after the independent Deletes finish.
  Missing computers count as removed.
  Confirmed ledger deletions keep later retries from repeating finished work.
- A creation claim captures a published image and its repository's default
  branch. One D1 transaction stores its start plan, env vars, and startup
  script, and leases the snapshot, before the workspace row exists.
- Cleanup waits for a lease before it deletes an old snapshot. D1 keeps
  deferred cleanup. A ready sandbox, a workspace delete, or a claim that
  leaves the pending state releases the lease.
- The composition root must pass the Members lifecycle hooks through
  `withImageSourceCleanup(env, fetch, hooks)` from `image-sources/members.ts`,
  as the [source loader](repository-layout.md#the-source-loader) says.

## Free storage

The save step of each build and refresh measures the free storage of the
image, as [The org image](../../docs/protocol/org-image.md#the-org-image)
requires. While the job has no snapshot name, `measureImageStorage` in
[`image-storage.ts`](image-storage.ts) runs `df` on the home folder after
the command journals are removed. `saveImageStorage` writes the size and
the "Avail" bytes to `image_builds.storage_total_bytes` and
`storage_free_bytes`. A repeat of the step writes the same columns again.
A failed or unreadable `df` records the `image_storage_unmeasured` warning
and leaves both columns null, and the save goes on.

`BUILD_STORAGE_COLUMNS` gives the two fields of `ImageBuild` to the build
list and the build snapshot. It returns them only for a good build of the
org's current provider account, and null for every other row.

## Step records

Each build and refresh writes the job step records of
[Step timing](../../docs/protocol/step-timing.md#job-step-records).
`buildPhaseStepStatements` in [`build-step-data.ts`](build-step-data.ts)
maps each phase to its steps. Each statement commits in the D1 batch of the
phase change that it measures: `beginBuildAllocation` and
`completeBuildPhase` in [`build-phase-data.ts`](build-phase-data.ts),
`failBuild` in [`build-data.ts`](build-data.ts), and `publishBuild` in
[`build-admission-data.ts`](build-admission-data.ts).

- `phase:allocating` and `computer:request` begin before the request for
  the build sandbox.
- `phase:sources` and `computer:boot` begin when the request returns. The
  first copy heading, `Updating the repositories.`, ends `computer:boot` in
  its own batch, because a copy command runs only on a ready sandbox. A
  build without that heading ends it with the next phase.
- `phase:software`, `phase:install`, `phase:snapshot`, and
  `phase:publish` begin with their phases. Each new phase ends the open
  steps.
- The publish ends the last step with `done`, at the time of
  `completed_at`. `failBuild` ends the open step with `failed`. Cleanup
  gets no step.
- A repeated phase change opens no second row and moves no begin.

## The software step

`buildSoftwareCommand` in [`build-software.ts`](build-software.ts) composes
the software command of a build or refresh. It reads the newest release.
It also reads the apt part version that the source image of the build
holds. For an org image, that version is `image_build_jobs.packages_version`
of the succeeded build that saved the image. For a pinned software image,
it is `software_images.packages_version`. The base image holds none.

When that version equals `imagePackagesVersion()` from
[`image-packages.ts`](image-packages.ts), the command runs the apt part only
when the sandbox lacks a package or the ttyd service is not masked.
Otherwise it runs the apt part. A NULL version, as in a row from before the
column, also runs it. Either way the command installs the newest release, as
[Installation](../../image/install.md) says. `recordSoftwarePackages` in
[`build-command-data.ts`](build-command-data.ts) stores the current version
before each start of the software command, so a succeeded build records the
apt part that its image holds. A repeated start reaches the command of the
first start, as the command journal says. So when two starts carry
different versions, the job keeps an empty version, and the next build from
its image runs the apt part.
`buildSource` gives the source image of a build. The sandbox request uses
it too, so the version and the snapshot always come from the same image.

## Provider retries

[Provider retries](provider-retries.md) gives the retry policy of builds,
refreshes, and starts after a transient provider error, the saved retry
state, the job limits, and the cleanup of an unresolved allocation.

## Refresh timers

`refreshImagesForPush` in [`image-timers.ts`](image-timers.ts) starts a
refresh for each org whose current image holds the pushed repository, and
that has an admin who is not suspended. It
acts on a push to the default branch, at most once in 30 minutes for each
org. A push during a running job waits for a later refresh. Only the
verified GitHub webhook receiver may call it. The
[GitHub backend](../github/README.md) owns that receiver. The image
coordinator starts the daily refresh by itself.
A daily refresh sets the saved daily deadline 24 hours after its start.

`imageHoldsOldValues` in
[`org-image-refresh-data.ts`](org-image-refresh-data.ts) is true when the
published image holds a repository name or default branch that differs from
the saved one, and the newest build succeeded. `readImageSchedule` then makes
the next alarm due at once, and `admitImageBuild` starts a build in place of
each refresh, also one that an admin starts. So a build follows each job or
failed start that leaves old values in the image.
In every other case, a refresh captures the repositories of the published
image with their saved name and default branch, read by repository ID in
`repositoriesWithSavedValues` of [`settings-data.ts`](settings-data.ts). It
keeps the folders of the image. So a refresh after a rename or a move works
also while the newest build failed, and the next build moves the folder. A
switch build captures its repositories the same way. The check reads no GitHub data,
so it cannot find a change whose webhook never saved it.
`wakeImagesForRepositoryChange` in
[`repository-change-builds.ts`](repository-change-builds.ts) wakes the
coordinator of each such org after the GitHub webhook receiver saves a
repository change. Its discovery reads the image of each org's current account.
It calls `scheduleIdleImage` in [`image-schedule.ts`](image-schedule.ts),
which reads that account and schedules from the saved job and refresh deadlines.
It reads the software release only when an org needs a wake.
[Repository changes on GitHub](../../docs/protocol/repository-changes-on-github.md)
states the rules.

Both refreshes start with the first admin who is not suspended, from
`firstActiveOrgAdmin` in [`settings-data.ts`](settings-data.ts). An org
without such an admin gets neither refresh. Its push uses no part of the
30-minute limit, and a recorded push refresh stays pending. Without a
waiting switch, the image coordinator sets no new alarm. A waiting switch
keeps its eligibility alarm.
[Operator actions](../../docs/protocol/operator-actions.md#starts-stops-and-builds)
states the rule.

## Key code

- [`build-admission-data.ts`](build-admission-data.ts): guarded image build admission and publication, with the installed runner version.
- [`build-end-data.ts`](build-end-data.ts): the shared writer for failure
  and publication, with the final state and its writes in one D1 batch.
- [`build-changes-data.ts`](build-changes-data.ts): `readBuildChanges`, the
  saved install script change and the added and removed repositories in
  `BuildsResponse.changes`. It reads the script reference and the published
  image's repositories for one provider account. The repository read uses
  the same source as creation admission.
- [`image-build-start.ts`](image-build-start.ts): new build input capture and guarded admission.
- [Provider switches](provider-switches.md#key-code): switch admission, waits, cancellation, and publication.
- [`image-builds.ts`](image-builds.ts): `startImageBuild` and
  `advanceImageBuild`, which removes the command journals before a snapshot.
- [`first-image-build.ts`](first-image-build.ts): `startAddedImageBuild`,
  which starts changed settings after the first good build finishes cleanup.
  It also builds waiting repositories after a successful build or refresh,
  when the newest build succeeded.
- [`image-build-failure.ts`](image-build-failure.ts): image failure classification, retry, warning, and allocation cleanup.
- [`build-execution.ts`](build-execution.ts): build commands and cleanup of every live ledger computer for the exact org and build.
- [`image-allocation.ts`](image-allocation.ts): `allocateImageBuild` creates
  or replays the allocation of a running build with the provider of its
  caller, saves the sandbox ID, and completes the allocation phase.
  `recoverImageBuildForCleanup` recovers a saved allocation for
  `cleanupBuild`, which passes a cleanup-mode client. It saves a recovered
  sandbox ID, or returns null after a certified absence. Failed image jobs
  retain their unresolved allocation phase until cleanup recovers and
  deletes the sandbox.
- [`build-log-statements.ts`](build-log-statements.ts): `buildLogStatements`,
  which splits output into rows and adds the budget statements of
  [`build-log-retention.ts`](build-log-retention.ts) to the same D1 batch.
- [`build-log-reader.ts`](build-log-reader.ts): `readBuildSnapshot`, which
  reads the build state and its log in one D1 batch.
- [`image-timers.ts`](image-timers.ts): `refreshImagesForPush` and
  `runImageAlarm`.
- [`repository-change-builds.ts`](repository-change-builds.ts):
  `wakeImagesForRepositoryChange`, the wake-up after a repository change on
  GitHub.
- [`image-coordinator.ts`](image-coordinator.ts): `ImageCoordinator`.
- [Software images](../software-image/README.md): the shared software builds and their cleanup.
- [`image-software.ts`](image-software.ts): the release install and workspace startup commands.
- [`build-software.ts`](build-software.ts): the software command of a build, with the source image and its apt part version.
- [`image-packages.ts`](image-packages.ts): the apt part, its version, and the check that skips it.
- [`software-release.ts`](software-release.ts): release metadata lookup and validation.
- [`software-bootstrap.ts`](software-bootstrap.ts): verified downloads and startup activation locking.
- [`image-runtime.ts`](image-runtime.ts): `IMAGE_NODE_RUNTIME`, the pinned
  private Node of the org image, and its paths. The
  [runtime guide](../../image/runtime.md#update-the-node-release) says how to
  update it.
