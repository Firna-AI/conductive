# Provider retries

This guide belongs to [Image builds](image-builds.md). It gives the retry
policy that builds, refreshes, and workspace starts share after a transient
provider error or a transient host error, the saved retry state, the job
limits, and the cleanup of an unresolved allocation.

## The retry policy

Builds, refreshes, and workspace starts share one saved policy for a
transient provider error. `transientProviderError` in
[`provider-retry.ts`](provider-retry.ts) decides which errors are
transient. A start, a build, and a refresh send their commands through the
[machine channel](../machines/README.md#the-machine-channel), so a step
with a command can also fail with a host error. Each transient host error of
`isTransientHostError` in [`errors.ts`](../machines/errors.ts), and a host
reply that does not match its request, `invalid_response`, use the same
policy. A host error has no `Retry-After`. Other errors keep their existing
handling.

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
  the pending wait. The next alarm then comes after 1 second, or after
  250 milliseconds for a start that polls, as
  [The start loop](start-loop.md) says. So a healthy
  command can run past the age of the window. A later fault in the same
  step still uses the first window.
- The window does not limit a whole job or a healthy command.
- The whole-job deadline takes precedence over a retry wait. The limits
  are in [Time limits of builds and starts](../../docs/protocol/workspace-life.md#time-limits-of-builds-and-starts).
- Cancellation and terminal cleanup do not wait for a pending retry.
- After a definite refusal of a source command start, such as HTTP 429,
  the job waits and retries the start within the retry window. A start
  with no confirmed reply still fails closed, as the
  [source loader](repository-layout.md#the-source-loader) says.
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

[`job-time-limit.ts`](job-time-limit.ts) supplies the job limits. An image
job uses its saved `started_at` value. A start saves one absolute deadline
beside its retry state. A phase change clears retry state and keeps the
job deadline. The image and workspace alarm schedulers cap their next
retry at that deadline. Terminal cleanup keeps its own retries after the
job fails.

A failed image job keeps the `allocating` phase when a dispatched request
has no confirmed sandbox ID. The existing build row owns that cleanup.
[`cleanupBuild`](build-execution.ts) recovers the saved request with
[`recoverImageBuildForCleanup`](image-allocation.ts), through a client of
the job's provider account in the `'cleanup'` mode. The helper saves a
recovered ID with that account before cleanup deletes the sandbox. Only
finished cleanup writes `done`.

A Boat client ignores the mode and replays the saved request unchanged. An
E2B client only finds the identity of the earlier request, with no create,
connect, or guest setup. A certified absence saves no ID, and the computer
ledger marks the allocation rejected. An unknown E2B result stays pending
for a later cleanup attempt. A definite refusal of the first dispatch needs
no allocation recovery. A refused replay after an uncertain dispatch keeps
the saved ownership.

An old start without a saved deadline uses its saved creation time or
lifecycle start time. The start coordinator saves the restored deadline
before it advances the job. A timed-out start with an unresolved
allocation moves its encrypted request to a separate cleanup job, as
[`retryAllocationCleanup`](start-allocation-cleanup.ts) handles.
