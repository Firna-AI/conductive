# Job step times

Status: Active. On branch `calummoore/record-step-times-for-builds-and-2nqj`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The perf push needs to measure each change from real jobs. Today a build or
a refresh keeps only its start, its end, and timed log lines. A workspace
start keeps its step times only in its Durable Object, and the next start
replaces them. This change adds two D1 tables. `job_steps` holds the begin
and the end of each step of each build, refresh, create, and resume.
`job_runs` holds one summary row for each run of a start. Operators and
agents read both tables with SQL. Users see no change. The cron deletes rows
after 90 days. The change does not cover disk retention restarts,
software image builds, or Continue.

## Decisions

Cal answered these on 18 November 2026, after the brainstorm in this
workspace. The options and the measurements are in
`.context/step-times/` of the workspace.

- **Decision 2, where to keep the times: D.** One D1 step table for every
  kind of job, written in the same D1 batch as each phase change.
  Rejected: A, timed build log lines and a start table, because agents then
  match log text; B, Analytics Engine, because agents cannot query it with
  today's access and it cannot join with builds; C, one JSON row for each
  job, because each query names JSON paths; E, Worker log lines, because
  the logs keep only a few days.
- **Decision 3, which boundaries: E.** Every phase with its begin and its
  end, the steps that users see, the moment that the computer is ready,
  and one summary row for each run of a start. A run row holds when the
  run was due, began, and ended, the count and the time of provider calls,
  command polls, and D1 calls, the slowest call with its name, and the
  time spent waiting to enter and to re-enter the chat queue. Rejected: A
  and B, because they cannot split a run of about 0.7 s, which workspaces
  296 and 317 need; C, because totals cannot name one slow call; D,
  because it changes the sandbox software.
- **Decision 4, how long to keep the records: B.** 90 days. Rejected:
  while the org exists, because the table can grow to many GB; 1 year,
  because the perf work compares weeks.
- **Decision 5, who sees the times: A.** Only operators and agents,
  through SQL. Rejected: step lengths in the build log, and an operator
  panel, because each changes a protocol doc for a measurement need.

## Design

- `job_steps`: key `(job_id, step)`. Columns: `job_kind` (`build`,
  `refresh`, `create`, `resume`), `org_id`, `workspace_id`, `started_at`,
  `ended_at`, `outcome` (`done` or `failed`), `worker_version`.
- `job_runs`: key `(job_id, run_number)`. Columns: `job_kind`, `org_id`,
  `workspace_id`, `phase`, `due_at`, `began_at`, `ended_at`,
  `queue_wait_ms`, `queue_rewait_ms`, `provider_calls`, `provider_ms`,
  `poll_calls`, `poll_ms`, `d1_calls`, `d1_ms`, `slowest_call`,
  `slowest_ms`, `worker_version`.
- Step names are fixed: `phase:<phase>` for each phase of the job,
  `computer:request` and `computer:boot` for the provider request and the
  wait until ready, and `step:<id>` for each start step that users see.
- Builds write their step statements in the D1 batch of each phase
  change. Opening a step closes every other open step of the job.
  `failBuild` closes the open step as `failed`. The publish closes the
  last step. Cleanup gets no step.
- Starts keep their step and run rows in Durable Object storage, then
  send them to D1 in the batch of the shown-state write. The run that
  ends a start sends the rest in one more write.
- A run begins at `WorkspaceAlarms.begin` and ends at its `finish`, inside
  the background work. Its due time is the earliest due time of the
  lifecycle sources that it owns.
- One timer per workspace object measures the run. The object wraps its
  `env.DB` and the providers that `providerForAccount` returns for that
  `env`, and it wraps the queue turn of the run.

Design calls, all made on 18 November 2026 (my calls):

- No runtime flag changes. The Worker has no async context, so each
  workspace object wraps its own `env`. Reason: the `nodejs_als` flag
  changes the production runtime for a measurement. Cost: a lifecycle call
  of another queue turn during an outside call of the run counts in the
  run.
- Run rows cover starts only. Builds get step rows. Reason: the perf work
  that needs runs is on starts.
- Disk retention restarts are out of scope, with a follow-up item.
  Reason: no user waits on them, and no perf workspace measures them.
- Rows hold fixed names, IDs, and times, never step labels. Reason: labels
  can hold repository and branch names.
- A step write uses `INSERT ... SELECT ... WHERE EXISTS` on the org, and
  conflict-safe SQL, so a record never fails the batch of a phase change.
- Each row holds `CF_VERSION_METADATA.id`, so a query can split by deploy.
- Old jobs get no backfill.

Contract owners:

- [Step timing](../docs/protocol/step-timing.md).
- The [workspace lifecycle README](../worker/lifecycle/README.md), with
  [Image builds](../worker/lifecycle/image-builds.md) and
  [Workspace Durable Object](../worker/lifecycle/workspace-object.md).
- The [migrations README](../migrations/README.md).

Design calls of Milestone 3, made on 18 November 2026 by its implementer:

- The wait to enter the queue again comes from the outside calls of
  `startGuard`, not from a wrapper of the queue turn. Reason: the
  receiver fence finds the generation of a turn by the turn object, so a
  wrapper would skip that check.
- The env of the lifecycle controller is a live view of the object env
  with a timed D1 binding. That binding marks the env for the provider
  wrapper. Reason: the test harness sets env values after the object
  starts, and a copy of the env keeps the binding.
- A sent step row of the running job stays in object storage until the
  job ends. Reason: the first ready read must close `computer:boot`, and
  the job end must close each open step.
- The `step:<id>` rows copy the steps of the lifecycle state at each send
  and at the job end, only for the step IDs that the Worker sets. Reason:
  one place sees every step change, and runner step IDs are not fixed
  names.
- The run that ends a start sends at most 10 batches of 50 rows. Later
  shown-state writes send the rest. Reason: a long start can buffer
  hundreds of run rows.
- When the batch with the rows fails, the shown state is written alone
  and the rows are dropped. Reason: a bad row must never hold back the
  shown state.

## Milestone 1: Documentation, schema, and shared records

Depends on: none

- [x] Add the job step records section to `docs/protocol/step-timing.md`.
- [x] Read both legal pages and every public guide in full. Update each
      sentence that the new record changes.
- [x] Add the migration with both tables and their indexes. Update
      `migrations/README.md`.
- [x] Add the shared statements: open a step, close the open steps, and
      insert a run row. Add the 90-day deletion to the 15-minute cron.
- [x] Add the tests of the statements and of the deletion.

## Milestone 2: Build and refresh steps

Depends on: 1

- [x] Write the step statements in each build phase change, the failure,
      the publish, and the copy start that ends `computer:boot`.
- [x] Test a build, a refresh, a failed build, and a replayed phase change.
- [x] Update `worker/lifecycle/image-builds.md`.

## Milestone 3: Start steps and runs

Depends on: 1

- [x] Add the run timer and the timed D1, provider, and queue turn
      wrappers. Test each wrapper.
- [x] Buffer the phase, computer, and user-visible step rows of a start in
      Durable Object storage.
- [x] Record one run row for each run of a start.
- [x] Send the buffer to D1 in the shown-state batch, and the rest after
      the last run.
- [x] Test a create, a resume, a failed start, and a repeated send.
- [x] Update `worker/lifecycle/workspace-object.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add the follow-up item for disk retention restarts.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, query both tables for one refresh and one create,
      and send the first numbers to workspaces 296 and 317.
