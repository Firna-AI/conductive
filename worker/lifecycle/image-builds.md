# Image builds

This page belongs to the [workspace lifecycle README](README.md). It says
how the lifecycle code builds and refreshes the org image. The org image is
the saved snapshot that every new sandbox of an org starts from. The
README's [Builds and refreshes](README.md#builds-and-refreshes) section says
where a build sandbox starts, and the risk to the clone token of each copy.

## Build jobs

`startImageBuild` in [`image-builds.ts`](image-builds.ts) records a build or
refresh for an org admin and returns its ID. A request during a job gets
its ID and schedules it again. Each alarm advances the job one step.
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

## Refresh timers

`refreshImagesForPush` in [`image-timers.ts`](image-timers.ts) starts a
refresh for each org whose current image holds the pushed repository. It
acts on a push to the default branch, at most once in 30 minutes for each
org. A push during a running job waits for a later refresh. Only the
verified GitHub webhook receiver may call it, and that receiver does not
exist yet. The image coordinator starts the daily refresh by itself.
A daily refresh sets the saved daily deadline 24 hours after its start.
