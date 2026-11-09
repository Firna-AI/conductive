# Member dialog uses an admin backdrop

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the review of `calummoore/workspace-archive-icon`.
- **Location:** `docs/mockups/src/screens/NewWorkspaceDialogScreen.tsx:136` and `docs/mockups/src/screens/workspaceState.ts`.
- **Reason:** The admin backdrop already exists on `origin/main` and needs a separate change.

- **Terms:**
  - **Mockup:** A rendered screen in `docs/mockups/` that defines the product's visual requirements.
  - **Viewer:** The person and role that a mockup represents.
  - **Backdrop:** The workspace screen behind the New workspace dialog.
- **Background:** The New workspace dialog has a `viewer` state for an admin or a member. A member state represents Priya. The dialog for an active org renders `WorkspaceScreen` behind it with `readyWorkspace` as its state. That fixture represents Cal as an admin.
- **Problem:** A member dialog uses an admin backdrop. The rail, owner menu, and workspace archive controls can describe or offer admin actions while the dialog represents a member. The same mismatch existed before Archive moved from the header to the list.
- **Impact if no action:** The member mockup does not show the permissions of its viewer. It can guide an incorrect implementation.
- **Root question:** How should a dialog and its backdrop use the same viewer?
- **Options:**
  - **A.** Set the backdrop's viewer from the dialog state. This corrects the current composition with a small change. Effort: Small.
  - **B.** Give the dialog and backdrop one shared viewer input at their composition boundary. Derive both screen states from it. This also prevents each part from choosing its own fixture viewer. Effort: Medium.
- **Left out:** Change nothing keeps the mismatch. A second workspace renderer for members would duplicate the existing renderer. A fixes the same view with less code and no extra renderer.
- **Wider fix:** B gives both parts one source for the viewer.
- **Previous examples:** None found in the focused review.
- **Recommendation:** B. One viewer input prevents the dialog and backdrop from choosing different roles.
- **Action:** fix after merge, apply B. The existing backdrop mismatch is outside the archive-control change.

The correction must keep the active workspace behind the dialog. A member
backdrop must show that member in the rail. It must show the owner menu
and Archive only when the member has the corresponding permission.
An admin backdrop must retain its admin controls. Use the existing
mockup build and visual smoke checks. Do not add a new gate for this task.
