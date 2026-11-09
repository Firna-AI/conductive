# The default install link leads to 404

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/github-installation-redirect`, review round 2, outside the scope.
- **Location:** `DEFAULT_GITHUB_APP_SLUG` in `worker/app-api/feature-github.ts:23`, and the row of `GITHUB_APP_SLUG` in `docs/deployment.md`.
- **Reason:** the code is the same on `origin/main`, and the branch fixes the return from GitHub, not the install link.

- **Terms:**
  - **GitHub App:** the app on GitHub that gives Conductive its sign-in, its repository access, and its webhooks. The deployed app is "Conductive Build", with the slug `conductive-build`, in the Firna-AI organization.
  - **Install link:** `https://github.com/apps/<slug>/installations/new`, which Get started and Account open. `githubInstallUrl` builds it from the Worker variable `GITHUB_APP_SLUG`.
- **Background:** `GITHUB_APP_SLUG` is optional. Without it, or with a value that is not a slug, the link uses the default slug `conductive`, and `docs/deployment.md` says so. The production deployment sets the variable. `README.md` does not list it among the values that `npm run dev` needs in `.dev.vars`.
- **Problem:** No public GitHub App has the slug `conductive`: `https://github.com/apps/conductive` returned 404 on 8 November 2026, and `https://github.com/apps/conductive-build` returned 200. So a deployment or a local run without the variable sends each install to a 404 page.
- **Impact if no action:** A new deployment or a developer without the variable cannot install the GitHub App from the app, and the page gives no reason.
- **Root question:** Which GitHub App should the install link open when the deployment names none?
- **Options:**
  - **A.** Make `conductive-build` the default slug, and update the row of `GITHUB_APP_SLUG` in `docs/deployment.md` and the test of the default in `worker/app-api/feature-github-install.test.ts`. Effort: Small.
  - **B.** Change nothing, and add `GITHUB_APP_SLUG` to the `.dev.vars` table of `README.md`. Each setup must still set it. Effort: Small.
  - **C.** Make `GITHUB_APP_SLUG` required, and refuse the install link without it. It adds a stricter validation, so the user must approve it. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. The default then names the app that exists.
- **Previous examples:** commit `ae8294c` made the slug a Worker variable, because the install link used `conductive` while the deployed app is `conductive-build`.
- **Recommendation:** A. It fixes every setup that does not set the variable, with no new rule.
- **Action:** fix after merge, apply A, because the code is the same on `origin/main` and outside the scope of the branch.
