# Part repairs run one after another

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sandbox-start-issue-secrets-q3is`, review round 1, the wider fix of finding 3.
- **Location:** `restore_parts` in `crates/cnd-cli/src/update/repair.rs`.
- **Reason:** the branch already gives each part its own attempt and its own share of the time limit, so parallel attempts only make a repair faster.

- **Source:** Review. **Category:** Performance.
- **Terms:**
  - **Repair:** the step of `update apply` that downloads again each missing part of the release that starts, within one limit of 60 seconds.
- **Background:**
  - The repair tries each missing part in order. Each part gets the time that is left, divided by the parts that are left. A failed or slow part logs a warning, and the next part still gets its attempt.
  - Production lists the parts as `node`, `sdk-helper`, and `system`. The `sdk-helper` archive is about 329 MB, and it unpacks to about 794 MB.
  - Each part unpacks into its own private folder, and `part-publish.lock` covers only the last presence check and the rename. So attempts for different parts can run at the same time.
- **Problem:** A slow `node` download uses its whole share before `system` starts, although `system` is small and the runner cannot start without it.
- **Impact if no action:** On a slow link, a repair that could restore every part in 60 seconds can run out of time for the last part.
- **Root question:** How can each missing part use the whole time limit of a repair?
- **Options:**
  - **A.** Change nothing. Each part keeps its share. Effort: Small.
  - **B.** Start one attempt for each missing digest at the same time, each limited by the whole deadline, and unpack each result under the publish lock. Cost: all missing archives are in memory at once, up to about 400 MB. Effort: Medium.
  - **C.** Download the `system` part first. Cost: the code must know which part the launch needs. Effort: Small.
- **Left out:** A fetch of the whole release, because it downloads parts that are present.
- **Wider fix:** B, because no part then waits for another.
- **Previous examples:** None found.
- **Recommendation:** B. It gives each part the whole limit.
- **Action:** fix after merge, apply B, because the branch already removes the skipped attempts and B only improves time use.
