# Dialog section menu described as plain text

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the review of PR #443.
- **Location:** `docs/mockups/design.md:230` and `src/shell/new-workspace/NewWorkspaceDialog.tsx`.
- **Reason:** The footer change does not change the existing section picker.

- **Terms:**
  - **Section picker:** The menu at the top right of the New workspace dialog that displays the organization and selects a section within it.
- **Background:** The New workspace dialog creates a workspace from a task message. Its header contains a repository picker and a section picker.
- **Problem:** The design guide calls the organization and section plain text. The app renders the Section menu at this position.
- **Impact if no action:** A contributor can follow an incorrect description of the header.
- **Root question:** How should the guide describe the existing section picker?
- **Options:**
  - **A.** Describe the organization and section as a menu. Keep the behavior. Effort: Small.
- **Left out:** Restoring plain text removes the existing section selection. Removing the header description loses useful guidance. Only A preserves the behavior and coverage.
- **Wider fix:** None. The documentation skill already requires descriptions to follow behavior.
- **Previous examples:** `plans/follow-ups/bar-tint-comment-names-old-fill.md` records a stale visual description.
- **Recommendation:** A. It corrects the description without changing the picker.
- **Action:** fix after merge, apply A. The existing header is outside the footer change.
