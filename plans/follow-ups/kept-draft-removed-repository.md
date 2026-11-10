# A kept draft can hold a removed repository

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from Milestone 4 of the plan `plans/added-repository-builds.md`, branch `calummoore/new-repo-build-recreation`.
- **Location:** `src/shell/new-workspace/useNewWorkspaceForm.ts`, `src/shell/new-workspace/NewWorkspaceDialog.tsx`, `src/shell/new-workspace/NewWorkspaceScreen.tsx`.
- **Reason:** the form behaved the same way on `origin/main` before that plan, which changed only repositories that wait for their build.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Kept draft:** the message, the files, and the repository that New workspace keeps for each org and section until the person sends or clears them.
  - **Removed repository:** a repository that an admin took out of the org's choice on the Repositories tab of the org settings.
- **Background:**
  - New workspace lists the chosen repositories in its repository menu.
  - The form keeps the repository of a kept draft, also when that repository is no longer chosen.
  - When the repository of the form is not in the menu, the form hides the repository picker.
  - A create checks the repositories of the org image. A removed repository stays in the image until the next build.
- **Problem:** When an admin removes the repository of a kept draft, New workspace hides the picker and keeps Send on. The person cannot see or change the repository. The create then starts in the removed repository, or the Worker refuses it.
- **Impact if no action:** A person can start a workspace in a repository that the org removed, without seeing which repository it is.
- **Root question:** What does New workspace do with a kept draft whose repository the org no longer chose?
- **Options:**
  - **A.** The form drops a repository that the org no longer chose, and picks the first ready repository, as for a new draft. Effort: Small.
  - **B.** The form keeps the repository, shows it as off in the picker with a note that the org removed it, and turns Send off until the person picks another one. Effort: Small.
  - **C.** A, and a short note above the composer says which repository the form replaced. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. One rule then picks the repository of each form from the chosen and ready repositories.
- **Previous examples:** None found.
- **Recommendation:** A. The person always sees and can change the repository of the form.
- **Action:** fix after merge, apply A, because the problem is on `origin/main` and outside the change that found it.
