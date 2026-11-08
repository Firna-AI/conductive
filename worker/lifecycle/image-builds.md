# Image builds

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code builds and refreshes the org image. The org image is
the saved snapshot that every new sandbox of an org starts from. It also
gives the provider retry policy that builds, refreshes, and workspace
starts share. The README's
[Builds and refreshes](README.md#builds-and-refreshes) section says where a
build sandbox starts, and the risk to the clone token of each copy.

## Build jobs

`startImageBuild` in [`image-builds.ts`](image-builds.ts) records a build or
refresh for an org admin and returns its ID. A request during a job gets
its ID and schedules it again. Each alarm advances the job one step with
`advanceBuildStep` in [`image-build-steps.ts`](image-build-steps.ts).
Software and install commands run detached and stream their output.
D1 stores the step, output offsets, and log. Each row holds at most
256 KiB of UTF-8 text, split between complete characters.

D1 keeps at most 4 MiB of each build log: the first and the last output.
A write that passes that budget removes whole rows from the middle.
The line `[N output bytes omitted]` takes their place in the event order.

- A build loads the chosen repositories, installs the image software, runs
  the install script with Bash, and saves a snapshot. A refresh only loads
  the repositories of the current image again, and saves a snapshot.
- The org image changes only when the new snapshot is ready. Each job
  deletes its build sandbox at the end, and keeps its history and log.
- A creation claim captures a published image and its repository's default
  branch. One D1 transaction stores its start plan, env vars, and startup
  script, and leases the snapshot, before the workspace row exists.
- Cleanup waits for a lease before it deletes an old snapshot. D1 keeps
  deferred cleanup. A ready sandbox, a workspace delete, or a claim that
  leaves the pending state releases the lease.
- The composition root must pass the Members lifecycle hooks through
  `withImageSourceCleanup(env, fetch, hooks)` from `image-sources/members.ts`,
  as the [source loader](repository-layout.md#the-source-loader) says.

## Provider retries

Builds, refreshes, and workspace starts share one saved policy for a
transient Boat error. `transientProviderError` in
[`provider-retry.ts`](provider-retry.ts) decides which errors are
transient. Other errors keep their existing handling.

- The first transient error in an unfinished step opens a retry window of
  10 minutes, `PROVIDER_RETRY_WINDOW_MS`. A completed step resets it. A
  successful sandbox read or deadline update does not reset it.
- The first retry waits 1 second. Each later retry waits twice as long, up
  to 60 seconds. A retry never comes before the `Retry-After` of the error,
  and never after the end of the window. The next alarm comes at that time.
- When no retry fits in the rest of the window, or the window ends before
  a pending retry runs, the existing failure and cleanup handling runs. For
  an image job, that cleanup also revokes any source token, as the
  [source loader](repository-layout.md#the-source-loader) says.
- When a step runs without an error but does not finish, it clears only
  the pending wait. The next alarm then comes after 1 second. So a healthy
  command can run past the age of the window. A later fault in the same
  step still uses the first window.
- The window does not limit a whole job or a healthy command.
- Cancellation and terminal cleanup do not wait for a pending retry.
- A source command start never retries. It fails closed, as the source
  loader says.
- Workspace allocation uses the retry handling in [`start-allocation.ts`](start-allocation.ts).

An image job keeps this state in the nullable
`image_builds.provider_retry_json` column of migration
`202611070007_lifecycle_provider_retry.sql`. A start
keeps the same state in its saved start job. So the window survives a
restart of the object. Each completed build or source phase clears the
state in the same D1 batch as the phase change. A start changes only its
retry state in a storage transaction, so a cancellation and the saved
output offsets stay.

`nextProviderRetry` computes each wait.
[`image-retry-data.ts`](image-retry-data.ts) reads and writes the state of
an image job, and `completeBuildPhase` in
[`build-phase-data.ts`](build-phase-data.ts) completes a build phase.
`retryStartError` in [`start-provider-retry.ts`](start-provider-retry.ts)
and `retry` in [`start-storage.ts`](start-storage.ts) do the same for a
start.

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

Both refreshes start with the first admin who is not suspended, from
`firstActiveOrgAdmin` in [`settings-data.ts`](settings-data.ts). An org
without such an admin gets neither refresh. Its push uses no part of the
30-minute limit, a recorded push refresh stays pending, and the image
coordinator sets no new alarm.
[Operator actions](../../docs/protocol/operator-actions.md#starts-stops-and-builds)
states the rule.
