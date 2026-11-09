# Set up the deploy settings in GitHub

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, PR #82. The plan of that branch asked for the environment before the merge. The user asked to merge first on 9 November 2026.
- **Location:** The settings of the GitHub repository `Firna-AI/remote-code`, the section "GitHub settings" and "The deploy token" of `docs/automatic-deploys.md`, and `.github/workflows/deploy.yml`.
- **Reason:** only the user can make a Cloudflare token and change the settings of the repository. The token of the agents cannot change them.

- **Terms:**
  - **Environment `production`:** a GitHub environment of the repository. It holds the deploy secret and the deploy variable, and its branch rule decides which branches may use them.
- **Background:**
  - The workflow `Deploy` in `.github/workflows/deploy.yml` deploys each push to `main` to the test deployment at `conductive.build`. `docs/automatic-deploys.md` describes it.
  - Its jobs `settings` and `deploy` name the environment `production`. It needs the secret `CLOUDFLARE_API_TOKEN` and the variable `CLOUDFLARE_ACCOUNT_ID`.
  - Without both settings, each run warns and deploys nothing. With only one, the run fails.
  - GitHub creates a missing environment at the first run that names it, with no branch rule. So the first run after the merge likely created `production` with no rule.
  - The hand-deploy token that agents used for the first deploys expired at midnight on 8 November 2026.
- **Task:**
  1. Open the settings of the repository, then Environments, then `production`. Create it if it does not exist.
  2. Under Deployment branches and tags, allow only the branch `main`.
  3. Make a Cloudflare API token, as "The deploy token" in `docs/automatic-deploys.md` says: the template "Edit Cloudflare Workers", plus D1 Edit, for the account and the zones `conductive.build` and `conductive.page`.
  4. Store the token as the environment secret `CLOUDFLARE_API_TOKEN`, and the Cloudflare account ID as the environment variable `CLOUDFLARE_ACCOUNT_ID`.
  5. Start the workflow `Deploy` on `main` with the Run workflow button.
- **Impact if no action:** No push to `main` reaches the test deployment. An environment with no branch rule would also let a workflow on any branch read the token, once the token is stored.
- **Needs:** Admin access to the repository settings, and access to the Cloudflare account of the Worker `conductive`.
- **Done when:** a run of `Deploy` on `main` deploys, and its health check passes. Then delete this item.
- **Related:** `plans/follow-ups/first-automatic-deploys-check.md` checks that run.
