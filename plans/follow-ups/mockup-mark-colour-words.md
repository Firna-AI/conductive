# Mockup texts name wrong colours for the list mark

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from review round 1 of branch `calummoore/loading-issue-o4ns` (list mark while a workspace starts).
- **Location:** `docs/mockups/src/entries/app/shell/index.mockup.tsx`, the rationale of App shell. `docs/mockups/src/entries/components/workspaces/WorkspaceMark.mockup.tsx`, the Needs input variant.
- **Reason:** The words are already on `main`, and the branch did not change them.

- **Terms:**
  - **List mark:** the grid of nine cells beside a workspace name in the list, the command palette, and the chips.
- **Background:** [Workspace list marks](../../docs/protocol/workspace-marks.md) gives the colours: grey while the checks run, and blue while the agent needs input.
- **Problem:** The App shell rationale says that the mark is amber while the checks run. The Needs input variant of the Workspace mark page says that the green mark pulses.
- **Impact if no action:** A reader of the mockups learns the wrong colours, and a visual review can flag a correct mark.
- **Root question:** How do the mockup texts give the colours that the protocol doc gives?
- **Options:**
  - **A.** Change the two texts to grey and blue. Effort: Small.
- **Left out:** A check of colour words in mockup texts: the texts are prose, so no tool can match them to the rule.
- **Wider fix:** None. The documentation skill already gives each requirement one home.
- **Previous examples:** `3d3a8b70b` made the needs-input mark blue and left the variant text.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the texts are outside the review scope.
