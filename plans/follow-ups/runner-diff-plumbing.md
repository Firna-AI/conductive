# Runner patches follow workspace Git settings

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix that the agent split off review finding 151 of round 8.
- **Location:** `crates/cnd-runner/src/repository/diff.rs:86` and `crates/cnd-runner/src/repository/index.rs:208` and `:233`.
- **Reason:** It changes the Changes counts for members who set `diff.algorithm`, which needs its own review.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** See the header.
- **Background:** The runner builds each patch with porcelain `git diff`, which reads the display settings of the workspace's Git config. Review finding 151 found that `color.ui=always` broke the app's patch reader, and its fix adds `--no-color`. Other display settings still apply, such as `diff.noprefix`, `diff.context`, and `diff.algorithm`.
- **Problem:** A workspace setting can still change the patch format or the counts that the app and the runner read.
- **Impact if no action:** A member with an unusual Git setting can see a diff with missing rows or counts that differ from Changes.
- **Root question:** How does the runner give the app a patch whose format does not depend on the Git settings of the workspace?
- **Options:**
  - **A.** Produce the patch with `git diff-index -p` with the same flags, and switch the two Changes comparisons the same way, so that counts and rows use one diff algorithm. Check intent-to-add entries, renames, and submodules. Effort: Medium.
  - **B.** Pass `-c` overrides for each display key to every runner Git command in `git.rs`. Effort: Small.
- **Left out:** Isolation from all user Git config, because `hash-object --path` must apply the workspace's line-ending and filter settings.
- **Wider fix:** A.
- **Previous examples:** Review finding 151 of the same branch.
- **Related:** `plans/follow-ups/diff-reply-row-facts.md`.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it changes the Changes counts for some members.
