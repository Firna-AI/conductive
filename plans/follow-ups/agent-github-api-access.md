# Agents have no signed-in GitHub command line

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, a new problem of the options check of decisions 507 to 511 of the routines plan.
- **Location:** None.
- **Reason:** The change needs the user's decision on a rule of `docs/protocol/access-and-security.md`, and the routines plan does not change GitHub access.

- **Terms:**
  - **Git credential helper:** the program in each cloud computer that asks the Worker for a fresh GitHub token of the sender of the current turn, for each Git operation.
  - **`gh`:** GitHub's command line, which agents use to read and write pull requests, reviews, and comments.
- **Background:**
  - "What a sandbox holds" in `docs/protocol/access-and-security.md` says that GitHub access reaches a workspace sandbox only through the Git credential helper.
  - Nothing in `image/` installs or signs in `gh`. An org's install script can install it, but no token signs it in.
  - "Agent logins in a sandbox" in the same doc records that each process can get the sender's token during a turn, for example with `git credential fill` (decision 121).
  - The repository docs do not list the permissions of the GitHub App. A user token can write a review only when the app has the pull request write permission.
- **Problem:** An agent cannot read or comment on a pull request with `gh`, and only a workaround with `git credential fill` reaches the GitHub API. A routine such as "Review each pull request and post one review" then cannot post its review in a simple way.
- **Impact if no action:** Review and triage routines, and agents in normal workspaces, cannot use the GitHub API as the user expects.
- **Root question:** How does an agent in a cloud computer use the GitHub API with the sender's access?
- **Options:**
  - **A.** Change nothing. An agent can use `git credential fill` and `curl`, and an org can install `gh` in its install script. Effort: Small.
  - **B.** Install `gh` in every image, with a wrapper that gets a fresh token from the Git credential helper for each command, as `GH_TOKEN`. The token never goes to disk. Effort: Medium.
  - **C.** As B, and check that the GitHub App has the pull request and issue write permissions that a review needs. Effort: Medium.
- **Left out:** A token in the environment of the cloud computer at its start. A user token expires after 8 hours. Decision 114 keeps agent logins out of the environment of tool processes, and the same reason holds for a GitHub token.
- **Wider fix:** None, because B already gives one path for every GitHub API call.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/github-token-readable-in-sandbox.md` records the risk of the sender's token in the sandbox.
- **Recommendation:** C. Agents then use `gh` as they do elsewhere, with the same token rule as Git.
- **Action:** ask the user, because B and C change the rule that GitHub access reaches a sandbox only through the Git credential helper.
