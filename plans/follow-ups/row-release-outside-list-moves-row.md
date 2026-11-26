# A row released outside the list moves

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the review of `calummoore/merge-queue-k2ep`.
- **Location:** `src/shell/list/drop-target.ts:97`.
- **Reason:** The defect is on `main` before the merge queue, so its fix belongs in its own branch.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Row drag:** the move of a workspace row of the sidebar list to another place or section with the pointer.
- **Background:** A member drags a workspace row to move it within its section or to another section. The drag computes its target place from the pointer position and saves the place on each move. A release writes the saved place.
- **Problem:** `targetAt` reads only the vertical position of the pointer and keeps the last place when the pointer leaves every section. So a row released in the main pane, at the height of a section, moves to that section.
- **Impact if no action:** A member who drags a row out of the sidebar and lets go can move the workspace to a section that the member did not choose.
- **Root question:** How can a release move a row only to the place that the member points at?
- **Options:**
  - **A.** Check both coordinates against the list at release, and keep the row in its own place when the pointer is outside the list. Effort: Small.
  - **B.** Use the browser's hit test, `document.elementFromPoint`, for the place on each move and at the release, as the merge queue drop already does after its review. The drag then shows no target outside the list. Effort: Small.
- **Left out:** A question before each move, because a row move must stay one gesture.
- **Wider fix:** B. One live hit test serves the screen and the release for every list drag.
- **Previous examples:** Finding 2 of the merge queue review fixed the same class for drops into the Merge queue group.
- **Recommendation:** B. It reuses the hit test that the merge queue drop already uses.
- **Action:** fix after merge, apply B, because the defect is on `main` and needs its own branch.
