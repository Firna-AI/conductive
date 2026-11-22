# Apply chooses the repaired release twice

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sandbox-start-issue-secrets-q3is`, review round 1, the wider fix of finding 5.
- **Location:** `apply`, `rollback`, and `restore_parts` in `crates/cnd-cli/src/update/engine.rs` and `crates/cnd-cli/src/update/repair.rs`.
- **Reason:** the branch adds regression tests for each branch of `apply`, so the refactor only removes a way to get the choice wrong.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Repair:** the step of `update apply` that downloads again each missing part of the release that starts.
  - **Fallback:** a start that restores the previous release, because a new release has no confirmation.
- **Background:**
  - `apply` has three branches: a fallback to the previous release, no change of the current release, and a switch to a newer release.
  - Each branch passes a release name to `restore_parts`, and then passes a release name again to the rollback or the activation. Nothing ties the two names.
  - The unit test `pending_start_repairs_and_restores_previous_and_rejects_failed_release` in `crates/cnd-cli/src/update/_tests_/apply_tests.rs` now proves that a fallback repairs the previous release before its first state change.
- **Problem:** A later edit can repair one release and start another, and only the tests catch it.
- **Impact if no action:** A start can run a release whose parts nobody checked, which fails when a part is lost.
- **Root question:** How does apply start only the release that its repair checked?
- **Options:**
  - **A.** Change nothing. The regression test guards the fallback. Effort: Small.
  - **B.** Select the release once, then pass that one value to the repair and to the rollback or activation. Effort: Medium.
  - **C.** Make `restore_parts` return a value that names the release it checked, and make the rollback and activation take only that value. It also fits a selection that changes after a failed repair. Effort: Medium.
- **Left out:** A test for each branch alone, because it adds tests and leaves the two separate choices.
- **Wider fix:** C, because the type ties each start to its repair.
- **Previous examples:** None found.
- **Related:** None. Cal's decision of 22 November 2026 settled the selection: apply starts a newer release only when each of its parts is present, and a fallback switches only to a previous release with each part present. Option C fits that rule: `restore_parts` can return whether the release it checked is ready.
- **Recommendation:** C. It ties each start, and each fallback, to the release that the repair checked.
- **Action:** fix after merge, apply C, because the tests already guard each branch.
