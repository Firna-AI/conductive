# Alert a person when a started deploy fails

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, a new problem that the check of review finding 4 found after the last fix round.
- **Location:** `.github/workflows/deploy.yml`, the job `redeploy`, and the section "When it runs" of `docs/automatic-deploys.md`.
- **Reason:** the options differ in a new secret and in where the alert goes, so the user chooses.

- **Terms:**
  - **Started run:** a run of the workflow `Deploy` that the job `redeploy` starts through the GitHub dispatch API, with the workflow token of the run before it.
  - **Workflow token:** the `GITHUB_TOKEN` that GitHub gives each run. Its actor is the bot `github-actions`, not a person.
- **Background:**
  - The workflow `Deploy` in `.github/workflows/deploy.yml` deploys each push to `main` to the test deployment at `conductive.build`.
  - GitHub does not keep the runs of one concurrency group in push order, and a re-run keeps the outputs of the jobs that passed. So a run of an older commit, and a re-run of only some jobs, deploy nothing. The job `redeploy` starts a new run on `main` instead, and that run deploys the head of `main`.
  - GitHub sends a failure alert for a run to the person who starts the run. For a push, that is the person who merged. For a started run, it is the bot of the workflow token. So a failed started run likely alerts no person. No real run has confirmed this yet.
  - `docs/automatic-deploys.md` tells the reader to look at the new run in GitHub Actions after a re-run.
- **Problem:** When a started run fails, the newest commit does not go live, and nobody hears about it.
- **Impact if no action:** The live app can stay on older code until the next merge or a manual run. You and the agents may then test old code without knowing it.
- **Root question:** How does a person learn that a deploy of the newest commit failed, whoever started the run?
- **Options:**
  - **A.** Keep the docs note only. Look at GitHub Actions after a re-run or an out-of-order merge. Effort: Small.
  - **B.** Start the new run with a token of a person or of a GitHub App, stored as a secret of the environment `production`, so that GitHub alerts that person. It adds one more secret to rotate. Effort: Small.
  - **C.** Add a last step to the job `deploy` that runs only on failure and opens or updates a GitHub issue. GitHub then notifies the people who watch the repository. It needs the job permission `issues: write`. Effort: Small.
- **Left out:** A job that waits for the started run and fails with it, because the started run waits in the same concurrency group until the job ends.
- **Wider fix:** C. Every failed deploy alerts the people who watch the repository, whoever started the run.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/deploy-records-through-api.md` changes the same job `deploy`, so the two changes can land together.
- **Recommendation:** C. It covers every failed deploy without a new secret.
- **Action:** ask the user, because B adds a secret, C adds a write permission and issues, and no option is clearly best.
