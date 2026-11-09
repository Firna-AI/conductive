# Smoke-test the automatic first build when deployed

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, the post-merge task of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** None.
- **Reason:** the task needs the merged change on the deployed app and a real cloud computer.

- **Terms:**
  - **First build:** the build of the cloud computer image that Create org starts by itself. Until it succeeds, the org has no image that a workspace can start from.
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex.
- **Background:** Create org now requires at least one repository and starts the first build. The org step of Get started shows that build, and New workspace keeps Send off with a notice until a build succeeds. The tests run against fake GitHub and fake sandbox servers, so no test proves the whole path on a real cloud computer.
- **Task:**
  - On the deployed app, create an org with one repository.
  - Check that Get started shows "Preparing" with a time that moves, then "Ready".
  - Open New workspace during the build, and check that the notice shows and Send is off.
  - After the build, send a first message, and check that the workspace starts from the new image.
  - Save an install script during a second test org's first build, and check that one more build starts by itself after the first one succeeds.
- **Impact if no action:** A fault that only a real cloud computer shows can reach the first users of every new org.
- **Needs:** the merged change on `conductive.build`, a GitHub account with the GitHub App installed on a test repository, and a Claude or Codex login.
- **Done when:** each check above passes on the deployed app, or each failure has its own follow-up item.
