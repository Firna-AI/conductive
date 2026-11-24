# Continue failures

This page belongs to [Continue](continue.md). It gives the failures of a
Continue job, its recovery, and the stop cause that each stop saves.
[Continue](../../docs/protocol/continue.md) states the requirements.

## Failures and recovery

- A refused phase before a command ends the job with a safe error, which
  the poll returns. Each stop also saves a [stop cause](#stop-causes).
- A safe error of a step, or an access error that the job kept while a
  command ran, keeps its own code and text.
- Each other stop ends the job with 409 `workspace_continue_failed`.
  `continueFailed` in [`continue-failure.ts`](continue-failure.ts) chooses
  its text from the stop cause and the phase:
  - The `checkout-clash` cause names the clash with the latest base, and
    says that the workspace stays on the old branch.
  - A stop in the `fetch` phase, with any cause, says that Continue could
    not finish. It adds the hint to check GitHub access and try again.
  - Each other stop says only that Continue could not finish.
- The clash text names the real branches, and the saved error keeps them.
  The routes hide each secret value in that text, as
  [Labels](continue-routes.md#labels) says.
- No other cause has text of its own yet. No cause names an access
  problem, so the fetch hint does not come from a known cause.
  [Continue stop messages need approved words](../../plans/follow-ups/continue-stop-cause-copy.md)
  records the open question of these words.
- Once a fetch or a move started, each later step settles that command
  first. A failed access check then closes the fetch scope and keeps the
  error, but the command result is still read. While the workspace record
  names the saved sandbox and account, the read uses the machine channel of
  the workspace. When the record is gone or names another computer, the
  provider still reads a command that it started on the saved sandbox. A
  command that the host started then cannot settle, because the host
  connection of the workspace belongs to the current computer. The job ends
  with the kept error.
- A fetch that ends after a cancel or a kept error ends the job with that
  error. A move that ended well goes on to its publication, also after a
  cancel.
- The first transient failure to read host status saves its time in the
  job. Continue retries the status read for two minutes. Any status reply
  clears the time. If the read still fails at the limit, Continue follows
  lost-process recovery. The recovery command goes through the machine
  channel and can reattach through the saved provider account when the
  host is away. The original process ID is used only on its starting route.
- After a lost start reply from the host or the provider, or a lost
  process, Continue only reattaches to the saved command journal. A lost
  process is a `lost` status, or a provider 404 for a command on the
  provider route. A command that never reached the sandbox
  fails the job, so no operation starts again with an old identity. The
  journal keeps the exit status of an ended command. So a reattach reads
  the same reserved status, and saves the same stop cause.
- When a move loses its process or ends with an error, Continue first
  reads the actual branch of the working repository with
  `continueBranchCommand`. On the new branch, the read checks that the
  fetched base resolves, points `origin/HEAD` at it again, and sets the
  `gh-merge-base` setting of the new branch again. Then the move is done,
  so publication runs without another checkout. A HEAD on the old branch
  keeps the rules above. Any other answer, also a failed write of
  `origin/HEAD` or of that setting, keeps the reservation, and the step
  retries until the read names one of the two branches. So no new branch
  publishes with an old base.
- The read prints only the branch name, and drops the Git error text. A
  base that does not resolve, or a failed metadata write, ends the read
  with status 82. The job then saves the `comparison-metadata-failed`
  cause, and the step retries.
- A failure during publication or during a started command retries after
  one second. The move stays done, so no second branch starts.
- A member or org suspension and a lifecycle stop cancel the job. The fetch
  scope closes at once.

## Stop causes

The job saves the cause of a stop in its optional `stopCause` field.
`ContinueStopCause` in [`continue-stop-causes.ts`](continue-stop-causes.ts)
is the closed list of causes. A cause is a fixed name, so it holds no Git
text, path, token, or provider body.

| Cause | When the job saves it |
| --- | --- |
| `cancelled` | A cancel. Each later save keeps it. |
| `provider-preparation-failed` | The client of the saved provider account fails, or the auto-stop deadline cannot be set. |
| `sandbox-start-failed` | The resume fails, or the workspace reaches the `error` state while Continue waits for it. |
| `command-start-uncertain` | A start of the fetch or the move fails or gets no reply. Or the command ends with status 125, because the journal holds no result. |
| `checkout-clash` | The move ends with status 80. |
| `index-lock` | The move ends with status 81. |
| `comparison-metadata-failed` | The move or the read of the branch ends with status 82. |
| `unknown` | Every other failure, such as status 1 or a timeout. It is also the default. |

- `readContinueJob` reads a missing or unrecognized cause as `unknown`. So
  a job of an older deploy keeps working. The job keeps the earlier shapes
  of `failure`, `outcome`, and `phase`.
- The job saves the route of a started command, `host` or `provider`, in
  `commandRoute` beside its process ID. A saved process without a route
  reads on the provider path, so such a job stays readable. A saved job
  with the `host` route needs a Worker that has the
  [machine channel](../machines/README.md#the-machine-channel). The same
  holds for a saved [repository change](repository-change.md) job.
- After a cancel or a kept access error, the end status of a command does
  not change the cause.
- Unless the job is cancelled, a good start of a command and the good end
  of the fetch or the move set the cause back to `unknown`. Each save of a
  cancelled job keeps `cancelled`. So `command-start-uncertain` after a
  reattach, and `comparison-metadata-failed` after a repair, do not stay.
- The poll reply holds no cause. The cause and the phase choose the text of
  `workspace_continue_failed`, as
  [Failures and recovery](#failures-and-recovery) says.
- When a stopped job ends, `continue.ts` logs a safe warning through
  `warnWorker`. [`warning-continue.ts`](../warning-continue.ts) builds its
  fields: only fixed fields, and the normalized stop cause and phase.
