# A press on a chip button can leave the pressed flag of the field set

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the review of branch `calummoore/file-modal-hover-popup-0ore`.
- **Location:** `src/chat/components/chip-field/focus-plugins.tsx`.
- **Reason:** The review found it outside the diff. Nobody checked it in a browser yet.

- **Background:** The `caretAtEnd` plugin notes a press of the pointer, so a focus from a press does not move the caret. The buttons of a chip, such as the ×, cancel their `mousedown`, so the field keeps the focus.
- **Problem:** A press on such a button while the field has no focus can leave the flag set. The next focus from the keyboard then does not put the caret back.
- **Impact if no action:** After that press, Tab into the field leaves the caret at the start, not where it was.
- **Root question:** How does the field forget a press that gave it no focus?
- **Options:**
  - **A.** Clear the flag at the end of each press, also when no focus follows. Effort: Small.
  - **B.** Change nothing, if a browser check shows no effect. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A, after a browser check confirms the problem.
- **Action:** fix after merge, apply A.
