# Choose the CI test shard count again

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from the branch `calummoore/lima-4mfe`, the post-merge task of its plan.
- **Location:** `.github/workflows/ci.yml`, the `matrix.shard` list and the `--shard=<n>/4` argument of the `tests` job.
- **Reason:** The choice needs the job times of real CI runs on `main` after the merge.

- **Terms:**
  - **Complete gate:** the required CI check. In `.github/workflows/ci.yml`, the job `gate` with the name "Complete gate" passes only when the job "Static checks" and every "Tests (n/4)" job passed.
  - **Shard:** one part of the Vitest test files. `vitest run --shard=2/4` runs the second quarter of the files.
- **Background:**
  - On 12 November 2026, Cal chose to run the gate as parallel jobs and to start each Worker test runtime from one migrated template database.
  - The gate now has one "Static checks" job (`npm run check:static`) and four "Tests" jobs. Each runs on the GitHub-hosted `ubuntu-24.04` runner.
  - Before the change, one job ran `npm run check`. It took 21 to 32 minutes on `ubuntu-latest` and 29 to 76 minutes on a 2-CPU Blacksmith runner.
  - On the pull request, two runs took about 5 minutes 20 seconds and 5 minutes 40 seconds from the first job start to the end. Each shard ran about 260 of 1,041 files. Their Vitest steps took 233 to 270 seconds. "Static checks" took about 5 minutes.
  - Four shards were a first guess. A simulation of the 2-CPU times gave a largest shard of 388 s for 4 shards, 267 s for 6, and 219 s for 8. Each job also pays about one minute for checkout and `npm ci`.
- **Task:** Read the job times of the last 5 green CI runs on `main`, for example with `gh run view <id> --json jobs`. Compare the slowest "Tests" job with "Static checks". When the "Tests" jobs end clearly later than "Static checks", raise the shard count. When they end clearly earlier, lower it. Change both the matrix list and the `--shard` argument, and the shard count in `AGENTS.md` and `README.md`.
- **Impact if no action:** The gate may wait on its slowest job longer than it needs to, or start more jobs than it needs.
- **Needs:** 5 CI runs on `main` after the merge.
- **Done when:** The shard count matches the measured times, or the item records that 4 stays, with the times.
