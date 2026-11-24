# Repository load failures

Status: Active. On branch `calummoore/repo-load-issue-e68j`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 24 November 2026, the org "Internal Tools" showed a red repository notice. It named ten removed repositories and said "The last build failed." Each build and refresh of that org had failed since 18 November with "The repositories could not load." The repository `bowser` had moved on GitHub from `futex-ai` to `Firna-AI`. The Worker saved the new name and install. The org image still held `futex-ai/bowser`. A refresh copies the values of the org image, and the check of each copy compares them with the saved values, so every daily refresh failed. The app starts no build by itself after a failed build (decision 12), so nothing ended the loop. The Worker logged only "HTTP 502, code unknown", so the cause of the failed build of 24 November is still unknown. The notice made the removed repositories look like the cause.

On 24 November 2026, Cal approved this plan with the word "impl". The approval confirms decision 1 B with its reversal of the rule of 17 November. It keeps decision 2 A and decision 3 A, not the options C that the options check recommended.

This change covers three user decisions. It does not change when the app starts a build, and it does not add a build log line for admins.

Contract owners:

- [Repository changes on GitHub](../docs/protocol/repository-changes-on-github.md).
- [Org image](../docs/protocol/org-image.md), for the repository notice.
- The [cloud computer guide](../src/marketing/docs/cloud-computer.md).
- The [mockups README](../docs/mockups/README.md) and the [UI README](../src/ui/README.md).

## Decisions

### Repository load decision 1: a refresh after a rename or a move

- **Choice:** B. A refresh finds each repository of the org image by its ID. It copies the repository with the saved name, default branch, and install. Cal chose B on 24 November 2026.
- **Alternatives:** A, skip the automatic refresh while the image holds old values, and show that a build is needed. C, change nothing.
- **Reason:** the refresh then works after a rename or a move, also while the newest build failed. New workspaces get new commits.
- **Replaces:** the rejection of "a refresh that finds the repository by its ID" in [The org image](../docs/protocol/repository-changes-on-github.md#the-org-image), from 17 November 2026. Its reasons were these: the checks that guard each copy change, and the folder takes the new name only at a later manual build. The design below keeps the checks. The folder point still holds while the newest build failed. B also departs, in that case, from [Folders over time](../docs/protocol/repository-folders.md#folders-over-time): "a rename moves its folder at the build that the rename starts". Cal confirms the reversal at the approval of this plan.
- **Options check, 24 November 2026:** it added these options. The recommendation stays B.
  - D: a refresh keeps the copy of the image for each repository that it cannot copy. It refreshes the others, publishes the image, and logs each kept repository. Wider fix. Effort: large.
  - F: the metadata step takes the name and the default branch from the GitHub reply that it already reads. Effort: large.
  - G: a failed automatic refresh shows to admins on the Cloud computer tab. Effort: medium.
  - The check advises B with D if the next failure of "Internal Tools" is a failure of one repository. B alone would then leave each refresh of that org failing.

### Repository load decision 2: the cause of a failed repository load

- **Choice:** A. The `image_build_failed` warning names the step of the repository load that failed, and the GitHub status when GitHub answered. It holds no token, no repository name, and no response text. Cal chose A on 24 November 2026.
- **Alternatives:** B, change nothing.
- **Reason:** one query of the Worker logs then finds the cause of the next failure.
- **Options check, 24 November 2026:** it added these options. The recommendation changed from A to C.
  - C: A, plus fixed words for admins. The failure message and the build log name the repository or the install that failed, such as "The GitHub App cannot reach Firna-AI/bowser." Effort: medium.
  - D: each error wrapper keeps the caught error as its cause, and the warning logs its safe fields. Wider fix. Effort: medium.
  - E: A, plus the index of the failed repository and the install ID in the warning. One database query then names the repository. Effort: small.
  - Reason for C: only an admin can change the GitHub App access. Worker logs expire, and the build log stays with the build. Cal answers at the approval of this plan.

### Repository load decision 3: the words of the repository notice after a failed build

- **Choice:** A. When the newest build failed, the title of the repository notice is "The last build failed". The body names the waiting and the removed repositories. Cal chose A on 24 November 2026.
- **Alternatives:** B, change nothing.
- **Reason:** the real problem comes first, and the removed repositories no longer look like the cause.
- **Options check, 24 November 2026:** it added these options. The recommendation changed from A to C.
  - C: A, plus the saved message of the failed build in the notice body on the Repositories tab of an admin. That tab has Try again but no build card. Effort: medium.
  - D: on the Cloud computer tab, the notice leaves out the failed state, because the build card under it shows the failure. Effort: medium.
  - Cal answers at the approval of this plan.

## Design

### Refresh by ID

- At the start of a refresh, the Worker reads the saved row of each repository of the published image, by its ID. The refresh job captures the saved name and default branch in place of the values of the image. The order and the folder locations of the image stay the same. A repository with no saved row keeps the values of the image, so its copy fails as before.
- The guards of each copy do not change: `readSourceRepositories` and `readSourceRepository` in `worker/lifecycle/image-sources/data.ts` still compare the job capture with the saved row. The capture now holds the saved values, so the guards pass. Each copy already reads the install from the saved row. The options check confirmed this.
- After the refresh, the published image holds the new values. `staleImageOrgs` then no longer counts the org. So the folder of a renamed repository keeps its old name and variable until the next build. That build moves it, because `sourceLayoutCommand` moves folders by repository ID. The options check confirmed this.
- When the newest build succeeded, a rename still starts a build at once, as today. My call, 24 November 2026: keep the build at a rename. Reason: the folder then takes the new name at once in the normal case, as the user chose on 17 November.
- So the choice between a build and a refresh moves into the start of the job. `startImageBuild` makes a refresh a build when `imageHoldsOldValues` is true at the capture. Today the alarm and the push path check it, but the admin refresh route in `worker/lifecycle/browser.ts` does not, and a change can come between the check and the capture. The options check found this.
- A change that the webhook saves during a running refresh stays for the next job, as today. Such a change still fails at the copy guard.
- A switch build of the operator copies the published capture as a refresh does, in `worker/lifecycle/provider-switch-builds.ts`. When it shares the capture code, it gets the same fix. Otherwise it becomes a follow-up item. It got the same fix. My call, 24 November 2026: the switch build takes the saved name and default branch of each repository, and keeps the folders. Reason: with the old values, the copy guards fail the switch. This is an exception to the rule of [The switch build](../docs/protocol/switch-account.md) that it takes no saved change, and that doc now states it.

### The cause in the warning

- A new error class in `worker/lifecycle/image-sources/` carries a fixed step: `builder`, `app_key`, `repository_values`, `metadata_token`, `metadata_read`, `source_token`, `copy`, `layout`, or `interrupted`. The catch in `materialize.ts` keeps the step of the error that it caught, and `unknown` for any other error.
- The GitHub transport keeps the HTTP status of a response that is not OK. `installationAccessToken` and the metadata read pass it on. The warning gives it as `githubStatus`, or `null`.
- `warnWorker` selects the two fields explicitly, as for every warning. The message of the failed build does not change.
- The source run saves the step of the first failure. Reason: when the cleanup cannot revoke every token in one alarm, the failure ends on a later alarm, as `worker/lifecycle/image-builds.ts` does. The options check found this.
- `warningCode` in `worker/warning-values.ts` allows `image_sources_unavailable` and `github_unavailable`. Today both log as `unknown`.
- The build log no longer says "Repository copy complete" for a failed copy, in `worker/lifecycle/image-sources/copy-data.ts`. It says that the copy failed. The options check found this.
- My call, 24 November 2026: a fixed list of steps, not the error message. Reason: `errorSummary` already keeps free text out of the logs.

### The notice words

- `repositoryNoticeText` in `src/ui/components/settings/repositoryChangeCopy.ts` gives the title "The last build failed" in the failed state. The body gives "<added> is ready after a build succeeds." when a repository waits. It gives "<removed> leaves after a build succeeds." for removed repositories, or "at the same build" after an added one. A member then reads "An admin can try it again."
- The other states keep their words. The notice of New workspace keeps its words. My call, 24 November 2026. Reason: decision 3 is about the repository notice of the Repositories and Cloud computer tabs.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The repository notice mockups read their words from `repositoryChangeCopy.ts`. This milestone changes the failed-state words there and checks every mockup that shows the notice.

- [x] Change the failed state of `repositoryNoticeText` as [The notice words](#the-notice-words) says.
- [x] Update the notes of the failed states in `docs/mockups/src/entries/components/settings/RepositoryNotice.mockup.tsx`, `ComputerTab.mockup.tsx`, and `docs/mockups/src/screens/settingsRepositoryNotice.tsx`, when they restate the title.
- [x] Run `npm run mockups:check`. Smoke-test the failed notice for an admin and a member, on the Repositories and Cloud computer tabs.
- [x] Update the design and the TODOs of this plan for each problem that the mockups show. The mockups showed no problem.
- Smoke-test screenshots: `.context/repository-load-failures/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] In [The org image](../docs/protocol/repository-changes-on-github.md#the-org-image), state that a refresh finds each repository by its ID and copies it with the saved values. Replace the rejection of that way with the decision and its date. Keep the build at a rename while the newest build succeeded.
- [x] In [Folders](../docs/protocol/repository-changes-on-github.md#folders) and in [Folders over time](../docs/protocol/repository-folders.md#folders-over-time), state that a folder keeps its old name after such a refresh, until the next build.
- [x] In [The repository notice](../docs/protocol/org-image.md#the-repository-notice), state the title of the failed state.
- [x] Read the cloud computer guide, `get-started.md`, and both legal pages in full. Update each sentence that restates a changed fact.
- [x] Update the README of `worker/lifecycle/` or `worker/github/` when it states what a refresh copies.

## Milestone 3: Refresh by ID

Depends on: 2

- [x] Capture the saved name and default branch for each repository of a refresh in `worker/lifecycle/image-build-start.ts`.
- [x] Make a refresh a build in `startImageBuild` when `imageHoldsOldValues` is true at the capture, for every caller.
- [x] Check whether the switch build in `worker/lifecycle/provider-switch-builds.ts` shares the capture code. Give it the same fix, or record a follow-up item. It got the same fix, in `provider-switch-builds.ts`.
- [x] Test: a refresh after a rename and after a move to another install copies the new values and keeps the old folder. The next build moves the folder.
- [x] Test: a refresh after a failed build and a rename succeeds. A repository with no saved row still fails.
- [x] Test: the admin refresh route becomes a build while the image holds old values and the newest build succeeded.

## Milestone 4: The cause in the warning

Depends on: none

- [x] Add the step error class, and throw it at each step of the repository load.
- [x] Keep the GitHub status in the transport and in `installationAccessToken`.
- [x] Add `sourceStep` and `githubStatus` to the `image_build_failed` warning. Save the first step on the source run.
- [x] Allow `image_sources_unavailable` and `github_unavailable` in `warningCode`.
- [x] Write a failed copy as failed in the build log, not as complete.
- [x] Test: each step gives its value, a GitHub 422 gives `githubStatus: 422`, and no token or name reaches the warning.

## Milestone 5: Notice tests

Tags: ui

Depends on: 1

- [x] Update the notice tests in `src/members/`, `src/shell/settings/`, and `src/ui/` for the new failed-state words.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and `npm run check`. The static checks and the mockup build passed. The full Vitest suite timed out on this cloud computer. The same tests also time out on a clean `origin/main` here, so CI gives the result. Logs: `.context/repository-load-failures/gate*.log` and `related-tests.log`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, ask an admin of "Internal Tools" to select Try again. Read the `image_build_failed` warning when it fails.
- [ ] After the deploy, read the result of the next automatic refresh of "Internal Tools". It copies the ten removed repositories too. When one repository fails it, raise decision 1 option D again.
