# A failed GitHub read hides the install

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/github-installation-redirect`, the check of review finding 3, round 1.
- **Location:** `getStartedGitHubComplete` in `worker/app-api/get-started-github.ts:47`, and the rule for a failed GitHub read in `worker/app-api/README.md`.
- **Reason:** the code is the same on `origin/main`, and the branch fixes the return from GitHub, not this read.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex. The reply of `GET /api/get-started` says whether the GitHub App step is complete.
  - **Saved repository:** a row of `repositories` in an org of the user, through an install that is not suspended. With one, the step is complete without a GitHub read.
- **Background:**
  - For a user with no saved repository, `getStartedGitHubComplete` refreshes the GitHub user token and reads `/user/installations`, page by page. The step is complete when GitHub lists an install that is not suspended.
  - `worker/app-api/README.md` states the rule for a failure: a failed GitHub read leaves the step incomplete and writes one fixed warning. The account and Get started still load. The boot of the app reads the steps, so this rule keeps the app usable while GitHub fails.
  - Since 8 November 2026, Get started reads the steps again each time that the user comes back to the page, so this read runs more often.
- **Problem:** A failed read answers `false`, the same answer as a real "not installed". When a later read fails, the app turns a complete GitHub App step back into an incomplete one.
- **Impact if no action:** After a short GitHub failure, Get started can show an installed GitHub App as not installed, and Create org stays off until the next read.
- **Root question:** What should Get started show when the app cannot read the install from GitHub?
- **Options:**
  - **A.** Change nothing. The next return to the page or a reload reads the install again. Effort: Small.
  - **B.** Give the step a third answer, such as unknown, for a failed GitHub read. The app keeps a step that already shows, and shows the step as not complete on a first read. It changes the reply of the Get started route, the shared contract in `src/shared/onboarding.ts`, and the rule in `worker/app-api/README.md`. Effort: Medium.
  - **C.** Keep the answer `false`, and let the app also complete the step from the installs list, which fails with its own error. The step then has two sources, which must keep the same meaning. Effort: Medium.
- **Left out:** Answer a failed GitHub read with the error `github_unavailable`: it fails the goal, because the boot of the app reads the steps, so the whole app would not load while GitHub fails.
- **Wider fix:** B. A failed read then never looks like a real answer, for every caller of the steps.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the app usable while GitHub fails, and it stops a failure from hiding an install.
- **Action:** ask the user, because B changes the reply of the Get started route and a documented rule for a failed GitHub read.
