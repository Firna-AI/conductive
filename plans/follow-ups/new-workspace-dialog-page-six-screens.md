# The New workspace dialog page shows six screens

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from Milestone 1 of the plan `plans/added-repository-builds.md`, branch `calummoore/new-repo-build-recreation`.
- **Location:** `docs/mockups/src/entries/app/new-workspace/dialog/index.mockup.tsx`, `docs/mockups/catalogue.md:39-40`.
- **Reason:** the page showed six screens on `origin/main` before that plan, which added no saved state to it.

- **Source:** Implementation. **Category:** Mockup.
- **Terms:**
  - **Folder page:** one page of the Mokly mockup catalogue under `docs/mockups/src/entries/`. It shows its canonical screen and its saved states.
  - **Saved state:** a variant of an entry module, with its own props and its own screen on the page.
- **Background:**
  - `docs/mockups/catalogue.md` says that a folder page shows at most five screens, saved states included. A folder with child folders shows only its canonical screen.
  - The entry `app/new-workspace/dialog` has its canonical screen and five saved states: `first-build`, `no-login`, `not-created`, `no-repositories`, and `workspace-link`. So its page shows six screens.
  - The plan of added repositories needed the waiting repository in the dialog. It drew those states on the child page `app/new-workspace/waiting-repository` of the New workspace page instead, because the dialog uses the same repository menu and notices.
- **Problem:** The dialog page breaks the five-screen rule, and a new state of the dialog has no place on it.
- **Impact if no action:** Each new state of the dialog goes to another page, and the dialog page stays over the limit.
- **Root question:** How does the catalogue show the states of the New workspace dialog within the five-screen rule?
- **Options:**
  - **A.** Move the five saved states into child folders of `app/new-workspace/dialog` that keep their paths. The dialog page then shows only its canonical screen. Effort: Medium.
  - **B.** Remove one saved state that another page already draws, such as `first-build`, which `app/new-workspace/first-build` draws for the page. This deletes a mockup state, so it needs the user's approval. Effort: Small.
  - **C.** Change the rule of the catalogue to allow six screens on a page. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. Child folders keep each page within the rule as the dialog gets new states.
- **Previous examples:** `app/new-workspace` and `app/org-settings/cloud-computer` moved their states into child folders and kept their paths, as `docs/mockups/catalogue.md` says.
- **Recommendation:** A. It keeps every state and every path, and it follows the earlier moves.
- **Action:** fix after merge, apply A, because the page broke the rule before the plan that found it.
