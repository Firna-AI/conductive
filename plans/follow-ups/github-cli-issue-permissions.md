# The GitHub App cannot read private issues

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the GitHub CLI authentication fix on branch `calummoore/github-cli-authentication`, item 1.
- **Location:** The Conductive Build GitHub App's Issues repository permission on GitHub. `image/github.md` describes the permission requirements.
- **Reason:** The app owner must choose and grant the new permission outside the repository.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **GitHub App:** Conductive Build, the GitHub integration that signs users in and gives workspace commands their GitHub tokens.
  - **Installation:** An account's approval for that GitHub App to reach its selected repositories.
- **Background:** Conductive gives each `gh` command a GitHub App user token. The token has only permissions granted to the GitHub App and its installation. On 9 November 2026, `gh api /apps/conductive-build --jq .permissions` showed no `issues` permission. The granted repository permissions were Checks read, Contents write, Metadata read, Pull requests write, Statuses read, and Workflows write.
- **Problem:** Automatic authentication alone cannot list private repository issues with the current GitHub App permissions. GitHub requires Issues read access for that operation.
- **Impact if no action:** Private issue commands can fail after authentication succeeds. Users must read those issues on GitHub instead.
- **Root question:** Should automatic GitHub CLI access list issues, or also create and change them?
- **Options:**
  - **A.** Grant Issues read-only on the GitHub App. Approve the permission update on each affected installation. This supports listing private issues. Effort: Small.
  - **B.** Grant Issues read and write on the GitHub App. Approve the permission update on each affected installation. This also supports creating, changing, and closing issues, with broader access. Effort: Small.
- **Left out:** Keeping no Issues access cannot list private issues. Separate personal tokens add another credential instead of fixing the shared GitHub App grant. Read-only and write access are the two available grants that meet the reported command.
- **Wider fix:** None. GitHub controls this permission outside the repository. The guide records the required grants for issue commands.
- **Previous examples:** The app already grants Contents, Pull requests, and Workflows write access for other GitHub operations.
- **Recommendation:** A. It gives the reported list command the required access with the smallest permission change.
- **Action:** ask the user, because this adds a GitHub App permission that the app owner must choose and approve.

After the choice, change the app's Issues repository permission at
`https://github.com/organizations/Firna-AI/settings/apps/conductive-build/permissions`.
Approve the installation update for each account whose private issues the CLI must reach.
Then run `gh issue list` in a workspace from a rebuilt image.
Confirm that it lists issues without a sign-in or permission error.
Delete this follow-up item after that check passes.

Sources:

- [GitHub's required permission for issue listing](https://docs.github.com/en/rest/issues/issues#list-repository-issues).
- [GitHub's app permission update and installation approval rules](https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration#changing-the-permissions-of-a-github-app).
