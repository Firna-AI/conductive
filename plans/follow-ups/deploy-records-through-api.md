# Record deploys through the deployment API

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, the wider fix of review finding 3, split off its direct fix.
- **Location:** `.github/workflows/deploy.yml`, the jobs `settings` and `deploy`.
- **Reason:** the direct fix leaves no early exit with success in the job `deploy` today, and the wider fix adds deployment API calls and a write permission that the first release of the workflow does not need.

- **Terms:**
  - **Deployment record:** the entry that GitHub writes in the history of an environment when a job that names the environment runs. Its status follows the result of the job.
  - **`deployment: false`:** a key of the `environment` of a job. The job keeps the secrets, the variables, and the branch rule of the environment, but GitHub writes no deployment record for it.
- **Background:**
  - The workflow `Deploy` in `.github/workflows/deploy.yml` deploys each push to `main` to the test deployment at `conductive.build`. `docs/automatic-deploys.md` describes it.
  - Its job `deploy` names the GitHub environment `production`, so each run of that job writes a deployment record.
  - Before the fix of finding 3, the settings check was the first step of the job `deploy`. When neither Cloudflare setting existed, the step ended with success and the job deployed nothing. GitHub then recorded a successful deployment of a commit that never went live.
  - The direct fix moved the settings check into a job `settings` with `deployment: false`. The job `deploy` now runs only when it deploys.
  - An earlier case of the same class: the re-run guard of commit `528f4ff`, which also ended the job `deploy` early with success.
- **Problem:** A later change can add a step to the job `deploy` that ends the job early with success. GitHub would then record a false successful deployment again.
- **Impact if no action:** The history of the environment `production` can again name a commit that is not live. Only the people and agents who build the app read that history.
- **Root question:** How does the deployment history name only the commits that went live, whatever early exit the job takes?
- **Options:**
  - **A.** Keep the current jobs, and keep early exits with success out of the job `deploy`. Effort: Small.
  - **B.** Give the job `deploy` `deployment: false` too. Create the deployment record and its status through the GitHub deployments API in the step after `wrangler deploy`, with the job permission `deployments: write`. Effort: Medium.
- **Left out:** Removing the environment from the job `deploy`, because its Cloudflare token is a secret of the environment.
- **Wider fix:** B. Only the step that deployed writes a record, so no early exit can write a false one.
- **Previous examples:** The re-run guard of commit `528f4ff`, and review finding 3 of branch `calummoore/deployment-on-merge-to-main`.
- **Recommendation:** B. It removes the class of false records at a cost of two API calls in each deploy.
- **Action:** fix after merge, apply B, because it adds API calls and a write permission that the direct fix does not need.
