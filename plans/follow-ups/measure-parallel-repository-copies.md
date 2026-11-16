# Measure parallel repository copies in production

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from the post-merge section of the plan `plans/parallel-repository-copies.md`, branch `calummoore/oslo-s346`.
- **Location:** `worker/lifecycle/image-sources/metadata-read.ts` (the 256 MiB floor and the estimate of twice the GitHub size), `worker/lifecycle/image-sources/schedule.ts` (the limit of 8 Git commands at once), and the memory budget of half of `MemAvailable` that the source loader reads at the start of the copy phase.
- **Reason:** only a deployed build on a real build sandbox gives the real copy time and memory use.

- **Terms:**
  - **Copy step:** the part of an org image build or refresh that copies each chosen repository into the build sandbox with Git. Its build log line is "Updating the repositories.".
  - **Memory budget:** the limit on the Git commands that run at once. It is half of the free memory of the build sandbox. Each command reserves twice the GitHub size of its repository, at least 256 MiB.
- **Background:**
  - Before this change, the source loader copied one repository at a time. Each repository needed at least four alarm runs, 1 s apart.
  - On 16 November 2026, on production, org `X6K5…` had 7 repositories. A build took 126 s, and the copy step took 75 s of it. The copy step was steady at about 75 s over the last 25 builds and refreshes. A refresh took about 100 s in total.
  - The sizes of the Git history were 66 MB, 53 MB, 39 MB, 13 MB, 2.3 MB, 1.2 MB, and 0.2 MB.
  - The change copies all repositories at the same time within the memory budget. A local harness counted 5 source loader calls for 7 repositories, in place of 31.
  - The expected copy step is about 15–20 s. The expected build is about 70 s, and the expected refresh about 45 s. These numbers are estimates.
  - The user chose these numbers on 10 November 2026: a limit based on "the size and the ram available". The 256 MiB floor, the factor of two, half of `MemAvailable`, and the limit of 8 are design calls. They were to be tuned after the first measurement.
- **Task:**
  1. After the deploy, start one build of an org with several repositories, for example org `X6K5…`. Also wait for one refresh.
  2. Read the times of the copy step and of the whole build and refresh in the build log.
  3. Read the peak memory of the build sandbox during the copy step. The Workers Logs give the alarm run times.
  4. Compare the times with 75 s, 126 s, and 100 s.
  5. When the peak memory is far below or near the budget, change the floor, the factor, or the limit, with a test.
- **Impact if no action:** the saving stays an estimate. A memory budget that is too small runs copies one after another. A budget that is too large can run the build sandbox out of memory with large repositories.
- **Needs:** the merged and deployed change, and access to the production build logs and Workers Logs.
- **Done when:** the measured times and the peak memory are recorded in a commit message or a pull request, and the numbers are confirmed or tuned.
