# The code view renders every line of a file

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, a check of review finding 6.
- **Location:** `src/files/code/CodeView.tsx` (the row loop), `src/files/diff/DiffView.tsx`, `docs/protocol/workspace-tools.md` (the 5 MiB read limit).
- **Reason:** `main` already renders every line, and a change of the rendering is its own work.

- **Background:** A file tab reads a file up to 5 MiB, or 5,242,880 bytes. `CodeView` renders each line as a DOM row with a number span, a text cell, and one span for each coloured token. Nobody has measured a large file. This repository's `package-lock.json` averages 34 bytes per line, so a 5 MiB file of such lines has about 150,000 lines and several hundred thousand nodes.
- **Problem:** A large text file can make the tab slow to open and to scroll.
- **Impact if no action:** A member who opens a large generated file can wait or see the tab freeze.
- **Root question:** How should a file tab stay responsive for every text file under the read limit?
- **Options:**
  - **A.** Measure first: open files of 10,000, 50,000, and 150,000 lines in the app, and record the open and scroll times. Effort: Small.
  - **B.** Render only the rows near the view, and keep select all, the copy, and the marked lines on a source model. Browser find then sees only the rendered rows. Effort: Large.
  - **C.** Show the first part of a very large file, with a notice and Download. Effort: Medium.
- **Left out:** A lower read limit, because it changes a requirement without data.
- **Wider fix:** B. It bounds the work by the view, not by the file.
- **Previous examples:** None found.
- **Recommendation:** A. A measure shows whether B or C is needed.
- **Action:** fix after merge, apply A, because the problem is not yet measured.
