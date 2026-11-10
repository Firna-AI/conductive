# The clone token risk misses a new repository

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from Milestone 2 of the plan `plans/added-repository-builds.md`, branch `calummoore/new-repo-build-recreation`.
- **Location:** `docs/protocol/github-tokens.md` (the "Risk:" line about the clone token), `worker/lifecycle/README.md` (section "Builds and refreshes").
- **Reason:** the sentence was incomplete on `origin/main` before that plan, because an admin could already add a repository and press Build computer.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Org image:** the saved snapshot that every new cloud computer of an org starts from.
  - **Clone token:** the GitHub App installation token of one copy of one repository in a build sandbox. It can read only that repository, and the Worker revokes it when the copy ends.
- **Background:**
  - A build sandbox starts from the last org image.
  - `docs/protocol/github-tokens.md` says: "A program with root access that an earlier install left in that image can read the clone token of a later copy. That token can only read its own repository, which the image already holds."
  - `worker/lifecycle/README.md` says the same.
  - Since 2026-11-10, an added repository starts a build at once. The first copy of that repository happens in a sandbox that starts from an image that does not hold it.
- **Problem:** For the first copy of an added repository, the token reads a repository that the image does not hold yet. The risk sentence says that the image already holds it.
- **Impact if no action:** A security review reads a smaller risk than the real one. The real extra risk is small: after the copy, a program in the sandbox can read the files of the repository anyway, and the token lives only until the copy ends.
- **Root question:** What does the risk of a clone token say about a repository that the image does not hold yet?
- **Options:**
  - **A.** Change both sentences: the token can only read its own repository; a program in the sandbox can also read the files of that repository after the copy, also for a repository that the image does not hold yet. Effort: Small.
  - **B.** A, and start the first build of an added repository from the base image in place of the last org image. A program that an earlier install left then cannot read the token. It costs a full install of every repository at each add. Effort: Large.
- **Left out:** No change, because the sentence misstates a security risk.
- **Wider fix:** None. A is the doc fix, and B removes the risk for this one case only.
- **Previous examples:** None found.
- **Recommendation:** A. The extra risk is small, and the doc then states it correctly.
- **Action:** ask the user, because the user decides which side of a protocol doc is right.
