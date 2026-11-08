# No requirement says where Manage access goes

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from branch `calummoore/manage-access-link-url`, item 1.
- **Location:** The section "Orgs" of `docs/protocol/orgs-and-members.md`, the Manage access link in `src/shell/settings/RepositorySearch.tsx`, and the mockup link in `docs/mockups/src/components/settings/RepositoryList.tsx`.
- **Reason:** option A adds a requirement to a protocol doc, and the user reviews each new requirement.

- **Terms:**
  - **GitHub App:** the one app on GitHub that gives Conductive its sign-in and its access to repositories. A person installs it on each GitHub account, personal or org, that owns repositories that the person wants to use.
  - **Installation:** the GitHub App on one GitHub account. Its settings page on GitHub chooses the repositories that the app reaches on that account.
  - **GitHub App page:** `https://github.com/apps/<slug>/installations/new`, where the Worker variable `GITHUB_APP_SLUG` gives `<slug>`. GitHub lists the accounts of the person there. An account with the app shows Configure, which opens the settings of its installation. Another account installs the app.
- **Background:**
  - Create org, at `/orgs/new`, and the Repositories tab of the org settings list the repositories that the GitHub App reaches. Under the list, and in an empty list, a Manage access link opens GitHub.
  - Until 8 November 2026, the link opened `https://github.com/settings/installations`. That page lists only the apps of the personal account. A person whose app is on an org account, such as `mokly-ai`, did not find the app there. The mockup had the same link, and the app copied it.
  - The fix on branch `calummoore/manage-access-link-url` opens the GitHub App page. `GET /api/account` gives that page as `githubAppUrl`. Manage on GitHub, in the GitHub section of the account screen, already opened the same page.
  - No protocol doc says which page Manage access opens. The section "Orgs" of `docs/protocol/orgs-and-members.md` says that the create screen lists the repositories that the person and the GitHub App both reach. The section "The GitHub App" of `docs/protocol/github-banner.md` says that a person installs the app on each GitHub account that owns the repositories.
- **Problem:** No requirement says what Manage access must let the person do. So a review cannot check the link, and nobody noticed the wrong page.
- **Impact if no action:** A later change can send the link to a page that hides org accounts again. A review then has no requirement that catches it.
- **Root question:** Which requirement states what Manage access lets the person do on GitHub?
- **Options:**
  - **A.** Add a requirement to the section "Orgs" of `docs/protocol/orgs-and-members.md`, after the sentence on the create screen. Proposed text: "Each list of the repositories that the GitHub App reaches has a Manage access link. The link opens the page of the GitHub App on GitHub. That page lists the GitHub accounts of the person, personal and org. There the person changes the repositories that the app reaches on an account, or installs the app on another account." Effort: Small.
  - **B.** Add no requirement. The mockup and the test in `src/shell/orgs/CreateOrgScreen.test.tsx` keep the behaviour. Effort: Small.
- **Left out:**
  - A requirement for one link for each installation, to the settings page of that installation: it gives no link when no account has the app, and it cannot install the app on another account. The GitHub App page covers both, and the account screen already uses it.
  - Only two approaches are real, because the question is whether to write the requirement. Where it goes is a detail of A.
- **Wider fix:** None. The Worker builds each link to the GitHub App with one function, `githubInstallUrl` in `worker/app-api/feature-github.ts`.
- **Previous examples:** None found.
- **Recommendation:** A. It states the behaviour that the fix builds, so that a review can check it.
- **Action:** ask the user, because option A adds a new requirement to a protocol doc, and the user reviews each new requirement.
