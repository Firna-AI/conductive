# Check an image build with the deployed archive

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/deployment-on-merge-to-main`, PR #82.
- **Location:** `.github/workflows/deploy.yml`, the section "The archive in each deploy" of `docs/deployment.md`, and `image/README.md`.
- **Reason:** the check needs a deploy run that sets the two runner variables, and a real org image build.

- **Terms:**
  - **Org image:** the prepared cloud computer image of an org. Each build of it installs the runner archive from the URL in `CONDUCTIVE_RUNNER_ARCHIVE_URL`, after a check of the digest in `CONDUCTIVE_RUNNER_ARCHIVE_SHA256`.
- **Background:**
  - Before the workflow, a person uploaded the archive `runner-a145db0.tar.gz` by hand and set the two Worker variables.
  - Each deploy run now sets both variables to `https://runner.conductive.build/runner-<sha256>.tar.gz` and its digest.
  - A refresh keeps the installed runner, so only a new build installs the new archive.
- **Task:**
  1. After a deploy run with both settings, start a new build of an org image in the deployed app.
  2. Check that the build log names the new archive URL, and that the build passes.
  3. Start a workspace on that image, and check that an agent answers.
- **Impact if no action:** A wrong URL or digest would fail every new image build, and nobody would see it until an org needs a new image.
- **Needs:** A deploy run with both settings, and a test org in the deployed app.
- **Done when:** a new image build installs the archive that the deploy published, and an agent answers in a workspace on it. Then delete this item.
- **Related:** `plans/follow-ups/first-automatic-deploys-check.md` checks the deploy run first.
