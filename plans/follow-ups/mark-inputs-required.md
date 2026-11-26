# The waiting answer of the mark is optional

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/loading-when-pending-p2f2`, review round 2, item 10 (the wider fix).
- **Location:** `src/ui/components/workspaces/WorkspaceMark.tsx` (`MarkState`, `markOf`), `docs/mockups/src/components/workspaces/rowMark.ts`.
- **Reason:** The fix changes the mockup chip entries outside the branch and needs a full mockup build, and a list test already covers the requirement.

- **Terms:**
  - **List mark:** the 3 × 3 grid beside a workspace name in the list, the command palette, and the chips.
  - **`markOf`:** the helper in `WorkspaceMark.tsx` that gives the mark the inputs of a workspace record: GitHub state, status, and waiting answer.
- **Background:** The list rows, the palette rows, and the chips draw the mark with `markOf(workspace)`. The mockups use `rowMarkOf(row)`. `MarkState`, the input type of the mark, keeps `messageWaiting` optional. A test in `src/shell/list/WorkspaceStates.test.tsx` checks the light of the list rows.
- **Problem:** A caller that builds the inputs by hand can leave out the waiting answer, and the typecheck accepts it. The protocol requires the same mark in the list, the palette, and the chips.
- **Impact if no action:** A later caller can draw a still mark for a start with a waiting message, and only a test of that place would catch it.
- **Root question:** How does the codebase make sure that each place that draws the mark of a record gets its waiting answer?
- **Options:**
  - **A.** Make `MarkState.messageWaiting` a required `boolean`. `markOf` and `rowMarkOf` give `messageWaiting === true`. Update the mockup mark entry, the mockup chip entries, and the tests that build inputs by hand. Effort: Medium.
- **Left out:**
  - A test for each caller: the callers share `markOf`, and a list test already covers it.
  - A lint that requires `markOf`: A removes the case without a new lint.
- **Wider fix:** A. The type then cannot hold mark inputs without the answer.
- **Previous examples:** Commit `88d665940` fixed the mockup palette, which drew the mark without the waiting answer.
- **Recommendation:** A. It removes the wrong case at the type level.
- **Action:** fix after merge, apply A.
