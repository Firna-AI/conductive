# A failed refresh start blocks push refreshes

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, a new problem of the check of finding 1 of review round 1, branch `calummoore/box-auto-build-onboarding`.
- **Location:** `refreshImagesForPush` and `runImageAlarm` in `worker/lifecycle/image-timers.ts`.
- **Reason:** the code was on `origin/main` before the automatic first build, and the change did not touch it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Push refresh:** an update of the org image after a push to the default branch of a chosen repository. It fetches the new commits and runs no install script. The protocol allows at most one in 30 minutes for each org.
  - **Push refresh mark:** the columns `last_push_refresh_at` and `pending_push_refresh_at` of the settings of the org. They hold the 30-minute limit and a refresh that waits for a running build.
- **Background:**
  - `refreshImagesForPush` first writes `last_push_refresh_at` and clears `pending_push_refresh_at`. It then calls `startImageBuild` to record the refresh.
  - `runImageAlarm` also clears `pending_push_refresh_at` and writes `last_push_refresh_at` before it calls `startImageBuild`.
  - `startImageBuild` can fail, for example on a short D1 fault or a refused coordinator schedule.
- **Problem:** When `startImageBuild` fails after the mark, no refresh runs, but the mark says that one ran. The next push refresh then waits up to 30 minutes, and a pending refresh is gone.
- **Impact if no action:** New workspaces start from older commits until the next refresh. Each new workspace still fetches its default branch, so no work is lost.
- **Root question:** How does a push refresh keep its 30-minute limit only for a refresh that the app recorded?
- **Options:**
  - **A.** Write the mark in the same D1 batch that records the refresh in `insertBuild`, as the daily refresh deadline already does. Effort: Small.
  - **B.** Restore the mark when `startImageBuild` fails. A second fault can leave it set. Effort: Small.
- **Left out:** A retry of the start, because the mark stays wrong while it waits.
- **Wider fix:** A. One batch ties the mark to the record of the refresh.
- **Previous examples:** `insertBuild` in `worker/lifecycle/build-admission-data.ts` already moves the daily refresh deadline in its own batch.
- **Recommendation:** A. It follows a pattern that exists.
- **Action:** fix after merge, apply A, because the problem is outside the scope of this change.
