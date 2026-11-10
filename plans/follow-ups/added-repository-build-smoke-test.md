# Smoke-test the build of an added repository

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge follow-up of the plan `plans/added-repository-builds.md`, branch `calummoore/new-repo-build-recreation`.
- **Location:** None.
- **Reason:** the test needs the deployed change, a real cloud computer provider, and a real GitHub App, which only the test deployment has.

- **Terms:**
  - **Org image:** the saved snapshot that every new cloud computer of an org starts from. A build makes it.
  - **Waiting repository:** a repository that the org chose and that the org image does not hold yet.
- **Background:**
  - Since 2026-11-10, an admin who adds a repository on the Repositories tab of the org settings starts a build at once.
  - While the build runs, New workspace shows the added repository as off in its repository menu, with a note that says when it is ready. The Repositories tab and the Cloud computer tab show a notice for the repository change.
  - When the build succeeds, the repository turns on, and a workspace can start in it.
  - `docs/protocol/org-image.md` (section "Repository changes") and `docs/protocol/create-a-workspace.md` (section "Waiting repositories") hold the requirements.
  - The tests run with fake GitHub and cloud computer servers, so no test reaches the real services.
- **Task:**
  1. On the test deployment at `conductive.build`, open an org with a good build, as an admin.
  2. Add a repository on the Repositories tab. Check that a build starts and that the notice shows.
  3. Open New workspace. Check that the repository is off, with its note.
  4. Wait for the build to succeed. Check that the notice goes and that the repository turns on.
  5. Start a workspace in the repository. Check that it starts, with the repository in its folder.
- **Impact if no action:** A fault that only the real services show, such as a refused clone of a new repository, stays unknown until a user meets it.
- **Needs:** The deployed change on the test deployment, an admin account in an org there, and a repository that the GitHub App can reach and that the org has not chosen.
- **Done when:** Each check of the task passes, or each failure has its own follow-up item.
