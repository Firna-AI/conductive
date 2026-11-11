# Check the software image on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, the post-merge tasks of the plan `plans/first-build-software-image.md`, branch `calummoore/global-snapshot-simplification`.
- **Location:** `.github/workflows/deploy.yml`, the step "Build software image" and the job `software-image`.
- **Reason:** the task needs the merged change on the deployed app, a real deploy run, and a real cloud computer.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software: the base image with the agent runner, its private Node, the terminal service, the agent tools, the git credential helper, and the GitHub CLI. It holds no org data. `docs/protocol/org-image.md` gives its rules.
  - **First build:** a build of an org that has no org image yet. It starts from the ready software image of the current version, copies the repositories, and runs the install script, with no install of the app's own software. Without a ready software image, it does that install itself.
  - **Deploy token:** a random token that each deploy run makes. The Worker keeps only its SHA-256 digest in the variable `CONDUCTIVE_DEPLOY_TOKEN_SHA256`, and accepts the token for 30 minutes after the creation time of its version, which the `version_metadata` binding `CF_VERSION_METADATA` gives.
- **Background:**
  - Each deploy run from `main` now calls `POST /v1/deploy/software-image` on `api.conductive.build` every 10 seconds, for up to 15 minutes, after its health check. A later job fails the run unless the last answer says `ready`.
  - The tests use fake provider and GitHub servers and a local D1. No test proves the real Cloudflare binding, the real provider snapshot, or the length of a real build.
  - The Worker refuses the route with 404 when the binding gives a creation time that does not parse. So a wrong binding format makes every deploy run fail at the job `software-image`.
- **Task:**
  - Watch the first deploy run after the merge. Check that the step "Build software image" prints the phases and ends with the result `ready`, and that the job `software-image` passes.
  - Note the length of the step. A build that needs more than 15 minutes fails the run, as `docs/automatic-deploys.md` says.
  - Create a test org with one repository on the deployed app. Check that its first build log goes from "Updating the repositories." to "Running the install script." with no "Installing the agent and terminal software." line.
  - Compare the length of that first build with a first build before this change.
  - Send a first message in the test org, and check that the workspace starts and an agent answers.
- **Impact if no action:** A fault that only the real Cloudflare binding or the real provider shows can fail every deploy run, or keep first builds slow, without anyone noticing.
- **Needs:** the merged change on `conductive.build`, access to the GitHub Actions runs of the repository, a GitHub account with the GitHub App on a test repository, and a Claude or Codex login.
- **Done when:** a deploy run ends with a ready software image, and a first build of a new org skips the install of the app's own software, or each failure has its own follow-up item.
- **Related:** `plans/follow-ups/first-build-smoke-test.md` smoke-tests the automatic first build on the deployed app. One session can run both items, and each keeps its own checks.
