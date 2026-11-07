# The Restore maintenance test passes its time limit under load

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #29, branch `conductor/boat-native-remote-workspaces-milestone-7s`, and PR #31, branch `conductor/boat-native-remote-workspaces-milestone-15e-window`. Both agents saw the case time out in the complete gate. It passed on a rerun.
- **Location:** `worker/members/restore-maintenance.test.ts:32`.
- **Reason:** the test is outside the diffs of the branches that met it.

- **Background:** The case "retries a Restore maintenance handoff and lets a newer Delete cancel its intent" runs in the Worker test harness, with a local D1 database and fake servers. Alone, it takes about 2.5 seconds of its 5-second limit.
- **Problem:** In the complete gate, many test files run at the same time. Under that load, the case passes 5 seconds and fails with `Test timed out in 5000ms`.
- **Impact if no action:** The complete gate fails now and then in agent workspaces and in CI, and agents lose time on reruns.
- **Root question:** How does this case stay well inside its time limit under load?
- **Options:**
  - **A.** Split the case in two: the retried Restore handoff, and the newer Delete that cancels the intent. Each half then runs well inside the limit. Effort: Small.
  - **B.** Give the harness tests a longer hang guard, as `plans/follow-ups/harness-test-time-limit.md` says. Effort: Small.
- **Left out:** None.
- **Wider fix:** B, for the whole class. It waits for the user as item 113.
- **Previous examples:** `plans/follow-ups/chat-stop-queue-test-time.md`, the same class.
- **Recommendation:** A. It needs no new limit, and each case then tests one requirement.
- **Action:** fix after merge, apply A, because the test is outside the diffs that met it.
