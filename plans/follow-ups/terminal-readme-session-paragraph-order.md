# A terminal README paragraph refers back past the prompt hook section

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from the round 2 review of branch `calummoore/riga-5hmk` (terminal history), outside the scope.
- **Location:** `worker/terminal/README.md`, the paragraph "So every connection of a workspace attaches to the same session".
- **Reason:** The paragraph was already on `origin/main`.

- **Background:** The terminal README describes the bridge, then the restore marker, then the prompt hook, then the shared session.
- **Problem:** The shared-session paragraph starts with "So", but it follows from the bridge text much earlier, not from the prompt hook text before it.
- **Impact if no action:** A reader can link the shared session to the prompt hook.
- **Root question:** Where does the shared-session paragraph belong in the README?
- **Options:**
  - **A.** Move the paragraph after the bridge text, or drop its "So". Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it is outside the diff.
