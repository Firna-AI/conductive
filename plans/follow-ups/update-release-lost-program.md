# A release that lost its program can still qualify

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-22, from branch `calummoore/sandbox-start-issue-secrets-v2-ffdj`, the Outside the scope list of review round 2.
- **Location:** `complete_versions` in `crates/cnd-cli/src/update/state.rs`, `release_ready` in `crates/cnd-cli/src/update/presence.rs`.
- **Reason:** the program file of a version is not a part, so the readiness rule of this branch does not cover it, and the fix needs its own decision on how to restore it.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Release program:** the file `/opt/conductive/versions/<version>/conductive`. The runner unit and the updater run it through the `current` link.
- **Background:**
  - A version counts as complete when its folder has the `complete` marker. A newer version is ready when each listed part is present.
  - Neither rule checks that the program file exists.
  - On 2026-11-20, a disk restore lost older files under `/opt/conductive` of one sandbox.
- **Problem:** A staged version with intact parts and its marker, but without its program, can still be selected. The switch then runs a missing program.
- **Impact if no action:** That start fails, and the next start can reject a good release.
- **Root question:** How does the updater treat a version whose program file is lost?
- **Options:**
  - **A.** Count a version as ready only when its program file exists, so the check stages it again. Effort: Small.
  - **B.** Download the program again in place, with the release digest, when the check finds it missing. Effort: Medium.
- **Left out:** A check at each start of the current program, because the runner unit fails at once when that program is gone, and only the bootstrap of the Worker can restore it.
- **Wider fix:** `plans/follow-ups/update-release-folder-state.md` option B, one classification of a release folder.
- **Previous examples:** None found.
- **Recommendation:** A. It reuses the staging path of a check.
- **Action:** fix after merge, apply A, because it is outside the scope of this branch.
