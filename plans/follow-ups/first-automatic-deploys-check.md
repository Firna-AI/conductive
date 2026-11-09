# Check the first automatic deploys

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, PR #82.
- **Location:** `.github/workflows/deploy.yml`, `image/package-runner.mjs`, and `docs/automatic-deploys.md`.
- **Reason:** a real deploy needs the merged workflow and the Cloudflare token of `plans/follow-ups/deploy-settings-setup.md`.

- **Background:**
  - The workflow `Deploy` deploys each push to `main`. Its job `deploy` builds the app, packages the runner archive with `--base-url https://runner.conductive.build/`, and names it `runner-<sha256>.tar.gz`.
  - It uploads the archive to the R2 bucket `conductive-runner` through the S3 API with the AWS CLI, only when no object of that name exists. The S3 key pair comes from the deploy token: the key ID is the token ID, and the secret key is the SHA-256 of the token value. Then it checks the size of the archive at the public URL.
  - It applies the D1 migrations, deploys the Worker with the two runner variables, and checks `https://app.conductive.build/api/health`.
  - No real run has used the token, the S3 upload, or the dispatch of a new run. Local proofs ran every shell block with stub commands. A local dry run of `wrangler deploy` passed.
  - The same source and packages give the same digest on one machine with two umasks. No proof exists yet on the GitHub runner.
- **Task:**
  1. Watch the first run of `Deploy` on `main` that has both settings.
  2. Check each step: the archive upload, the public size check, the migrations, the deploy, and the health check. Note whether the AWS CLI needed its checksum settings.
  3. Open `https://app.conductive.build`, sign in, and send a message in a workspace.
  4. Merge a change that does not touch `runner/`, and check that its run reuses the archive with no upload.
  5. Fix each error in a new branch and pull request.
- **Impact if no action:** A broken step can stop every deploy, and the live app stays on old code.
- **Needs:** The merged workflow, and the settings of `plans/follow-ups/deploy-settings-setup.md`.
- **Done when:** one run uploads and deploys, a later run reuses the archive, and the app answers. Then delete this item.
- **Related:** `plans/follow-ups/runner-archive-from-deploy-check.md` checks the archive in an image build.
