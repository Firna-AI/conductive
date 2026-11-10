# Check the first automatic deploys

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, PR #82.
- **Location:** `.github/workflows/deploy.yml`, `image/package-runner.mjs`, and `docs/automatic-deploys.md`.
- **Reason:** the remaining checks need a later deploy run and a signed-in person in the app.

- **Background:**
  - The workflow `Deploy` deploys each push to `main`. Its job `deploy` builds the app, packages the runner archive with `--base-url https://runner.conductive.build/`, and names it `runner-<sha256>.tar.gz`.
  - It uploads the archive to the R2 bucket `conductive-runner` through the S3 API with the AWS CLI, only when no object of that name exists. The S3 key pair comes from the deploy token: the key ID is the token ID, and the secret key is the SHA-256 of the token value. Then it checks the size of the archive at the public URL.
  - It applies the D1 migrations, deploys the Worker with the two runner variables, and checks `https://app.conductive.build/api/health`.
  - The first real deploy ran on 9 November 2026: run 42554229564 of commit `9ad3d121`, started by hand from `main`. Every step passed. It uploaded `runner-9c823dc293ffebb3078daf42804099d1e8d7137e209a565f36ea95718b5faff8.tar.gz` of 334,647,869 bytes in about 11 seconds, with the AWS CLI checksum settings `when_required`. It applied the migration `202611080100_agent_login_reuse.sql`, deployed Worker version `6ded0e98-4345-40d8-9488-3398084b687d` with its route, its three custom domains, and its cron trigger, and passed the health check.
  - The token is an account-owned token, so the run read its ID from `/accounts/<account>/tokens/verify`.
  - No run has yet reused an archive, and no run has started a new run through the dispatch.
- **Task:**
  1. Check that the next run of a change that does not touch `runner/` logs "Runner archive already exists." and uploads nothing.
  2. Open `https://app.conductive.build`, sign in, and send a message in a workspace.
  3. Fix each error in a new branch and pull request.
- **Impact if no action:** A broken step can stop every deploy, and the live app stays on old code.
- **Needs:** A later deploy run, and a person who can sign in to the deployed app.
- **Done when:** a later run reuses the archive, and an agent answers a message in the deployed app. Then delete this item.
- **Related:** `plans/follow-ups/runner-archive-from-deploy-check.md` checks the archive in an image build. `plans/follow-ups/provider-groundwork-deployed-smoke.md` also checks a deploy run and a message in the deployed app, so one session can run both items.
