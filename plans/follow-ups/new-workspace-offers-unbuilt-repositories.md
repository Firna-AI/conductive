# New workspace offers repositories that the image lacks

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the options check of decision 151 of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** `src/shell/new-workspace/NewWorkspaceScreen.tsx:130-131`, `worker/lifecycle/published-image-data.ts:22-31` and `:65`.
- **Reason:** the problem exists on `origin/main` after each change of the repositories, so it is outside the scope of the automatic first build of a new org.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Org image:** the saved snapshot of an org's cloud computer, with a copy of each repository that its newest good build loaded. Every new workspace starts from it.
  - **Repositories tab:** the tab of the org settings where an admin chooses the repositories of the org. It saves each repository at once.
- **Background:**
  - `docs/protocol/org-image.md`, section "The org image", says that a change of the repositories takes effect at the next build.
  - New workspace lists every chosen repository of the org. It reads them with `chosen = (repositories ?? []).filter((item) => item.selected)` at `src/shell/new-workspace/NewWorkspaceScreen.tsx:130`.
  - A create reads the repositories of the published org image. `readCreationImage` in `worker/lifecycle/published-image-data.ts` refuses a repository that the image lacks with HTTP 404, the code `repository_not_found`, and the words "The repository is not available."
  - The New workspace page shows that refusal as "The workspace wasn't created" with "The repository is not available. Your message is kept."
- **Problem:** After an admin adds a repository, New workspace offers it before a build has loaded it. The first message in it then fails, and the words do not say why or what to do.
- **Impact if no action:** Each member who picks the new repository before the next build gets a failed create. The message stays in the composer.
- **Root question:** How does a person who starts a workspace know which repositories are ready?
- **Options:**
  - **A.** Change only the refusal. It says that the repository is ready after the next build, and it links an admin to the Cloud computer tab. Effort: Small.
  - **B.** New workspace offers only the repositories of the newest good org image. A chosen repository that waits for a build shows as off, with a short note such as "Ready after the next build". The app needs the loaded repositories in an answer that it reads. Effort: Medium.
  - **C.** A change of the repositories starts a build by itself. This changes the decision of 5 November 2026 that an admin builds the image with Build computer. Effort: Medium.
- **Left out:** A start that clones the missing repository. It breaks the rule that each new workspace starts from the newest good org image, which holds a prepared copy of every chosen repository.
- **Wider fix:** B. The list then comes from the same data as the check of the create.
- **Previous examples:** None found.
- **Recommendation:** B. It stops the failed create before the message, and it reads the same data as the create check.
- **Action:** ask the user, because A and B add behaviour that no requirement states, and C changes a user decision.
