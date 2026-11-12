# Faster CI gate

Status: Active. On branch `calummoore/lima-4mfe`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The CI job "Complete gate" runs `npm run check` in one job. Since PR #302
moved it from `ubuntu-latest` (4 CPUs for a public repository) to
`blacksmith-2vcpu-ubuntu-2404` on 12 November 2026, a run takes 29 to 76
minutes. Before, it took 21 to 32 minutes. Vitest uses one worker fewer
than the CPU count, so on 2 CPUs it runs one test file at a time. Its step
takes about 24.5 of the 29.5 minutes of a typical run. About 511 Worker
test files use 86% of that time. Each one starts its own Miniflare runtime,
which spawns `workerd`, imports the 15 MB `wrangler` package for one SQL
helper, and applies all 46 migrations again.

Cal asked on 12 November 2026 for a faster gate without a large runner.
This change splits the gate into parallel 2-CPU jobs and makes each Worker
test file start cheaply. It runs every test, unchanged, on every pull
request. It does not change product code, test assertions, or time limits,
and it does not change the runner size. The measurements and the
brainstorm report are under `.context/ci/` and `.context/ci-speed/`.

Contract owners:

- [AGENTS.md](../AGENTS.md), sections Commands and CI.
- The [root README](../README.md), section on commands and CI.
- The [Worker test support README](../worker/test-support/README.md).
- The [runner README](../runner/README.md), the paragraph on the complete
  gate.

## Decisions

### 518. Choose how the CI gate gets faster on small runners

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. **Category:** Performance.
- **Location:** `.github/workflows/ci.yml`, `vitest.config.ts`,
  `worker/test-support/`.
- **Problem:** On 2 CPUs, Vitest runs one test file at a time, and each
  Worker test file pays 1 to 2 seconds of start-up before its tests run.
- **Impact if no action:** Each pull request and each merge to `main`
  waits 30 to 76 minutes.
- **Root question:** How does the gate finish much sooner on small runners,
  and still run every test unchanged?
- **Options:**
  - **A.** Run 2 Vitest workers on the 2-CPU runner. About 20 minutes. More
    load raises the timeout risk of
    `plans/follow-ups/tests-time-out-under-machine-load.md`. Effort: Small.
  - **B.** Make each Worker test file start cheaply: one migrated template
    database per run, no `wrangler` import in test processes, and the
    shared bundles built once. About 7 minutes less per run. Effort:
    Medium.
  - **C.** Split the gate into parallel 2-CPU jobs: 4 Vitest shards, one
    job for the other checks, and a last job named "Complete gate" that
    needs all of them. About 7.5 minutes, and about 5.5 minutes with B.
    About the same cost per run. Effort: Medium.
  - **D.** Let Worker test files share worker processes with
    `isolate: false`. 2 to 5 minutes less. State can leak between files.
    Effort: Medium.
  - **E.** A 4-CPU Blacksmith runner, the size that `ubuntu-latest` gave.
    About 21 minutes. Effort: Small.
- **Left out:** Run only the affected tests, because it weakens the gate.
  Cloudflare's Vitest pool, because it needs Vitest 4. Going back to
  `ubuntu-latest`, because `AGENTS.md` keeps the jobs on Blacksmith. An
  in-memory fake database, because the tests run on the real D1 and
  workspace object on purpose.
- **Recommendation:** C, then B.
- **Chosen:** C and B, by Cal on 12 November 2026.

## Design calls

These are my calls, on 12 November 2026. Each keeps every check and every
assertion.

- **4 shards.** The simulated largest shard is 388 s with 4 shards. Each
  shard adds about one minute of checkout and install. Revisit the count
  after B lands, with real CI times.
- **One ESLint pass.** `file-length:check` repeats the whole lint only to
  add `max-lines`. The `max-lines` rule moves into `eslint.config.js`, so
  `npm run lint` checks it. The root `eslint .` already covers `desktop/`,
  `runner/`, and `image/`, so no file gets a new rule. The gate drops the
  separate `file-length:check` step. The command stays, because it is an
  entry point that people use.
- **One typecheck in the gate.** The gate already runs `npm run typecheck`
  first. Its build step builds without a second typecheck. `npm run build`
  keeps its typecheck.
- **Static checks and tests as two scripts.** `npm run check:static` runs
  every check except the root Vitest suite. `npm run check` runs
  `check:static`, then `npm run test`. CI runs `check:static` in one job
  and the shards in the others, so CI and a local gate run the same list.
- **Fix the three 10-second waits** in `worker/devices/security.test.ts`.
  The close event of the test socket reaches the test 10 s after the server
  closes it. The fix waits on the event that the test means to check, and
  keeps each assertion. The cause: workerd ends the TCP connection of a
  socket that the server closed only when it evicts the idle object. The
  tests now evict the object after the alarm. An eviction keeps open sockets
  open, so the test still fails when the server does not close the socket.
- **One D1 id for every test runtime.** Miniflare names the database file
  after the id, so one template fits every runtime only with one id. Each
  runtime has its own storage folder, so the shared id shares no data.
- **A run folder for test storage.** The adapter runtime gives its
  Miniflare instance to tests that dispose it themselves. The global
  teardown deletes one folder per run, so no storage copy is left behind.
- **`deviceFixture` takes its entry file.** `device-cleanup.test.ts`
  swapped the entry through a Vite mock, which a cached bundle would skip.
  It now passes the entry, and each assertion stays.
- **Every shard runs to the end** (`fail-fast: false`), so one run reports
  every failed test.
- **The last job fails unless every needed job succeeded.** GitHub counts
  a skipped required check as passed. So the "Complete gate" job runs with
  `if: always()` and fails on a failed, cancelled, or skipped result.

## Milestone 1: Documentation

Depends on: none

Update the docs that describe the gate, so that they state the new layout.

- [x] `AGENTS.md`: Commands names `check:static`, says that `npm run lint`
      checks the 300-line limit, and says what `npm run check` runs. CI says
      that the workflow runs `check:static` and 4 Vitest shards as parallel
      jobs, and that the job "Complete gate" passes only when all of them
      pass.
- [x] `README.md`: the commands table and the CI paragraph say the same.
- [x] `runner/README.md` and `image/developer-scripts.md`: the sentences on
      the complete gate and the file-length check stay true.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2: Gate scripts

Depends on: 1

- [x] Add `max-lines: [error, 300]` to `eslint.config.js` for every linted
      file. Keep `file-length:check` as a command.
- [x] Add `build:bundle` (site build and Vite build, no typecheck). Keep
      `npm run build` as typecheck, then `build:bundle`.
- [x] Add `check:static`: typecheck, desktop and runner typecheck, lint,
      desktop lint, format, desktop format, exports check, runner tests,
      `build:bundle`, and the mockup check. Make `check` run
      `check:static`, then `npm run test`.
- [x] Run `npm run check:static`.

## Milestone 3: Device socket waits

Depends on: none

- [x] Find why the close event of the device socket arrives 10 s late in
      the three "fails work after the target desktop session becomes …"
      tests of `worker/devices/security.test.ts`.
- [x] Wait on the event that the test means to check. Keep each assertion
      and the 15 s hang guard.
- [x] Run the file 3 times. Each run passes, and each of the three tests
      takes under 2 s.

## Milestone 4: Cheap Worker test start

Depends on: none

- [x] Build the SQL of the migrations once per run in the Vitest global
      setup, and give it to the tests. Remove the `wrangler` import from
      test processes. Keep `before` and `from` for the migration tests.
- [x] Migrate one template database per run in the global setup. Each
      harness that applies all migrations starts from a copy of it, and
      deletes its copy when it closes. A harness with `migrationsBefore`
      and the migration tests keep the real migration path.
  - [x] Measure first that a file-backed copy does not make the tests
        slower than the in-memory database of today. If it does, apply the
        prepared SQL in one batch instead, and record the change here.
        Miniflare already keeps D1 in files under its temp folder, so the
        copy keeps the same kind of storage. 80 Worker files with one worker
        took 203 s before and 118 s after. Evidence: `.context/m4/`.
- [x] Build the shared Worker bundles once per run in the global setup, as
      the native bundle is built today.
- [x] Update `worker/test-support/README.md`.
- [x] Run the Worker tests and compare the time with
      `.context/ci/local-w3.log`.

## Milestone 5: Parallel CI jobs

Depends on: 2

- [x] In `.github/workflows/ci.yml`, add a job "Static checks" that runs
      `npm run check:static`, and a matrix job "Tests" that runs
      `npx vitest run --shard=<n>/4` for n from 1 to 4. Both keep the
      install steps of today and run on `blacksmith-2vcpu-ubuntu-2404`.
- [x] Add the job "Complete gate". It needs both jobs, runs with
      `if: always()`, and fails unless each needed job succeeded.
- [x] Keep the triggers, the permissions, and the concurrency group.
- [ ] Check on the pull request that the four shards ran every test file
      once, and that a failed shard fails "Complete gate".

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After 5 runs on `main`, compare the gate time with the 29 to 76
      minutes of today, and choose the shard count again.
