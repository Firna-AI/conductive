# Disk retention restarts have no step records

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from the branch `calummoore/record-step-times-for-builds-and-2nqj`.
- **Location:** `worker/lifecycle/disk-retention.ts`, `worker/lifecycle/job-steps.ts`, `migrations/202611201500_job_step_times.sql`
- **Reason:** The change that added the job step records covered only the jobs that a user waits for, and no perf work measures disk retention restarts yet.

- **Terms:**
  - **Disk retention restart:** a short start of a stopped sandbox near day 14 of its stop, so that the provider keeps its disk. No user waits for it, and it shows no start steps.
  - **Job step records:** the D1 tables `job_steps` and `job_runs`. They hold the begin and the end of each step of each build, refresh, create, and resume, and one row for each run of a start.
- **Background:**
  - On 18 November 2026 Cal chose one D1 step table for every kind of job, with every phase, the provider request, the wait until the computer is ready, and one row for each run of a start. Operators and agents read the records with SQL. The cron deletes them after 90 days.
  - The protocol doc `docs/protocol/step-timing.md`, section "Job step records", says that disk retention restarts get no records yet.
  - `job_steps.job_kind` and `job_runs.job_kind` accept only `build`, `refresh`, `create`, and `resume`, through a `CHECK` constraint.
  - A disk retention restart runs its own phases in `worker/lifecycle/disk-retention.ts`. It writes no start steps, and the next start deletes its D1 progress row.
- **Problem:** the records cannot show how long a disk retention restart takes, or where it waits.
- **Impact if no action:** a slow or failing restart stays hidden. Each restart holds a cloud computer and counts against the daily start limit of the provider.
- **Root question:** should disk retention restarts write job step records, and how?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Add the kind `disk-restart` with a migration that rebuilds both `CHECK` constraints. Write one step row for each retention phase in the D1 batch of that phase change. Effort: Medium.
  - **C.** Do B, and also write run rows with the run timer that starts use. Effort: Medium.
- **Left out:** reading the restart times from the Worker logs, because the logs keep only a few days.
- **Wider fix:** None. The shared statements of `worker/lifecycle/job-steps.ts` already serve every kind of job.
- **Previous examples:** the build steps in `worker/lifecycle/build-step-data.ts`.
- **Recommendation:** A, until a perf change targets the restarts. Then B.
- **Action:** ask the user, because the protocol doc leaves restarts out, and a change adds a requirement.
