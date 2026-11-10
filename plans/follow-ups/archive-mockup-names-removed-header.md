# Archive mockup names the removed header action

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the pull request bar actions mockup audit.
- **Location:** `docs/mockups/src/entries/app/archive/index.mockup.tsx`, the screen description.
- **Reason:** The description was already stale before the pull request bar actions change.

- **Terms:**
  - **Mockup catalogue:** The visual specification under `docs/mockups/`, rendered by Mokly at desktop and phone sizes.
- **Background:** The Archive mockup shows the question before Archive deletes a workspace's cloud computer. Archive keeps the chat as read-only history. The workspace list and the merged pull request bar offer Archive. The workspace header no longer offers it.
- **Problem:** The main Archive screen description still starts with "Archive from the header of a workspace". Its screen has no Archive control in that header.
- **Impact if no action:** A reader can implement or test a header control that the product removed.
- **Root question:** How does the Archive catalogue description identify the current path to its question?
- **Options:**
  - **A.** Describe Archive from the workspace list. Keep the existing question and merged-bar variant. Effort: Small.
- **Left out:** Restoring Archive in the header changes the product beyond this documentation correction. Removing the Archive example loses an existing visual specification. Only one correction preserves the current behavior.
- **Wider fix:** None. The documentation and mockup skills already require matching the product and its documentation.
- **Previous examples:** The workspace-header Archive removal left this description unchanged. The active description is in `docs/mockups/src/entries/app/archive/index.mockup.tsx`.
- **Recommendation:** A. It makes the description match the existing workspace-list action.
- **Action:** fix after merge, apply A, because the stale description predates the pull request bar actions change.
