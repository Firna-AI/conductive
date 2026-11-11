# The barTint comment names the old fill

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review round 5 of pull request #176, branch `calummoore/github-status-bar-actions`, finding 9.
- **Location:** `docs/mockups/src/components/workspace/prStatus.ts:128`.
- **Reason:** both review fix rounds of pull request #176 were used, so this Low comment fix waits for a later branch.

- **Terms:**
  - **Pull request bar:** the strip at the top of the right column of a workspace. It shows the GitHub state of the branch and one main action.
  - **barTint:** the mockup function in `prStatus.ts` that returns the tint of the main action for a bar state: green, amber, red, purple after a merge, or none.
  - **Outline tone:** the `secondary` tone of the Firna button, with a border and no fill.
- **Background:** On 11 November 2026 the user asked that no bar action show the blue primary fill. On a bar without a tint, the main action now takes the outline tone. `src/github/ActionButton.tsx` and `docs/mockups/src/components/workspace/BarActions.tsx` apply the rule, and `docs/mockups/design-bar.md` states it.
- **Problem:** The comment of `barTint` still says: "A bar without a tint keeps the primary fill." The code does the opposite.
- **Impact if no action:** A reader of `barTint` gets the wrong fill rule.
- **Root question:** Where does the fill rule of the bar live, so that no comment contradicts the rule that the user chose?
- **Options:**
  - **A.** Change the sentence to say that an action on a bar without a tint takes the outline tone. Effort: Small.
  - **B.** Limit the comment to the tint that `barTint` returns, and delete the sentence about the fill. The rule stays in `ActionButton.tsx`, `BarActions.tsx`, and `design-bar.md`. Effort: Small.
  - **C.** Give the fill rule one code home: a helper beside `TintedTheme` in `docs/mockups/src/components/common/tint.tsx` that gives a tinted button the primary tone and every other button the outline tone. Call it from `ActionButton.tsx` and `BarActions.tsx`, narrow the comment as in B, and update `plans/follow-ups/bar-button-fills-untested.md`, which names the rule in `ActionButton.tsx`. Effort: Small.
- **Left out:**
  - Keep the comment: it keeps the contradiction.
  - Restore the primary fill: it breaks the user's choice.
  - A test of the comment: the testing rules give comment prose no test.
- **Wider fix:** None. The documentation rules already ask that comments follow changed behaviour.
- **Previous examples:** Commit `2da7e3fa` narrowed a stale layout comment of `docs/mockups/src/components/layout/AppFrame.tsx` in the same way.
- **Related:** `plans/follow-ups/bar-button-fills-untested.md` adds the rendered test of the same fill rule. One branch can do both.
- **Recommendation:** B. A comment that states only what `barTint` returns cannot go stale when the fill rule changes. It matches the comment of `barViewOf` in `src/github/barView.ts`.
- **Action:** fix after merge, apply B, because both review fix rounds of pull request #176 were used and the finding is not critical.
