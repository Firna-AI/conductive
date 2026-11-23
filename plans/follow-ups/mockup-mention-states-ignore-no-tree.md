# Mockup `@` states ignore a missing tree

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the round 3 finding checks found outside the scope.
- **Location:** `docs/mockups/src/screens/composerFor.ts:125`.
- **Reason:** The wiring is already on `main`, and the change that found it only added the limited lists.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/screens/composerFor.ts:125`.
- **Terms:**
  - **Ready mention state:** A mockup state of the message box whose `@` list shows results, such as `mention-start`.
  - **`tree: 'none'`:** A workspace state in which no list of all files is available.
- **Background:** `docs/protocol/file-mentions.md:63` says that the `@` list shows that no list is available when All files has none.
- **Problem:** The ready mention states ignore `tree: 'none'`. So `mention-start` with `tree: 'none'` lists rows while All files says that no list is available. Only the `mockups:serve` controls reach this mix.
- **Impact if no action:** A catalogue reader who combines the two controls sees a state that the product does not allow.
- **Root question:** How do the mockup `@` states follow the tree state of the workspace?
- **Options:**
  - **A.** In `composerFor`, show the unavailable line of the `@` list for each ready mention state when the tree state is `none`. Effort: Small.
- **Left out:** A limit on the controls hides the mismatch and keeps the wrong wiring. One wiring change fixes the problem.
- **Wider fix:** None beyond A. A takes the coverage from the workspace state.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/mockup-mention-data-missing-paths.md` and `plans/follow-ups/mockup-tree-readers-one-coverage.md` have the same code. No options conflict.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the wiring is on `main` and is outside the scope of the change that found it.
