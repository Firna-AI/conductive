# Software image cleanup can delete the running version

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/global-snapshot-simplification`, review finding 14 of round 1 and its check.
- **Location:** `worker/software-image/cleanup.ts:84`, `worker/software-image/build.ts:47`.
- **Reason:** the case needs a deploy that goes back to an older software version while a first build still pins its image, and first builds keep the full-install fallback.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software: the base image with the agent runner, its private Node, the terminal service, the agent tools, the git credential helper, and the GitHub CLI. Each deploy run asks the Worker to build the image of the deployed version through `POST /v1/deploy/software-image`.
  - **App software version:** the SHA-256 digest of the exact commands that install that software. The Worker computes it with `softwareVersion` in `worker/software-image/version.ts`.
  - **Pin:** the column `image_build_jobs.software_image_name`. A build of an org without an org image records the ready software image that it starts from. The image cannot be deleted while a build job that pins it is not `done`.
- **Background:**
  - `cleanupOldSoftwareImages` in `worker/software-image/cleanup.ts` keeps the ready image with the latest build start, and deletes each other ready image that no unfinished build pins. The deploy route runs it after each ready answer, and the 15-minute Cron Trigger runs it again.
  - `advanceSoftwareImage` in `worker/software-image/build.ts` answers with the row that it read before the cleanup when D1 no longer holds that row.
  - `docs/protocol/org-image.md`, section "The software image", requires that the deploy run fails unless the software image of its version is ready (decision 5 F of 10 November 2026).
- **Problem:** Version A has a ready image that a running first build pins. A deploy of version B builds image B. Cleanup keeps A while the pin holds. A later deploy goes back to version A, and its request finds the ready row A. The cleanup in the same request, or a later Cron run, deletes A once the pin ends, because B started later. The route can then answer `ready` from the deleted row, and a later first build finds no image of the running version.
- **Impact if no action:** A deploy can pass without a software image of its version. First builds then do the full install of the app's own software until the next deploy run that changes the version.
- **Root question:** How does a successful deploy keep its software image available for first builds?
- **Options:**
  - **A.** If cleanup removes the requested image, create a fresh attempt and wait for it. Make the route answer from the row that D1 holds, and add the regression test. This repeats an avoidable install. Effort: Small.
  - **B.** Make both cleanup paths keep the image of the running Worker's software version before they look at image age. The Worker computes that version from `runnerSoftware(env)`. When the Worker has no runner software, keep the current rule. Add the regression test. Effort: Small.
  - **C.** Store the selected software image for each provider account, and make cleanup keep that selection. This needs a schema change and selection updates. Effort: Medium.
  - **D.** Rank images by the last deploy request, with a new `requested_at` column that each request sets before cleanup. Cleanup keeps the ready image with the latest request. This needs a new migration. Effort: Medium.
  - **E.** Apply B and A together. B keeps the image of the running version on both cleanup paths. A makes the route answer from the row that D1 holds, and start a new attempt when that row is gone. Add the regression test of B, and one case where a removal during the request gives no `ready`. Change the cleanup sentence of `docs/protocol/org-image.md` and of `worker/software-image/README.md` to say "each other image" in place of "each older image". Effort: Small.
- **Left out:** Change nothing, because a deploy can still pass after its image is deleted. Keep the newest N images, because cleanup still deletes an image outside the newest N. Keep only the requested image in the request cleanup, because the next Cron run still deletes it. A Worker cron that rebuilds a missing image, because the user chose the deploy run as the only starter of a build. Never delete a ready image, because the cleanup requirement of `docs/protocol/org-image.md` stays. A second check in the deploy step, because it cannot see a later Cron deletion.
- **Wider fix:** E. B protects the image of the running version on both entry points, whatever kept an older image, and A makes the route answer from D1, whatever removed the row.
- **Previous examples:** The org image cleanup keeps the published image in `worker/lifecycle/build-execution.ts`.
- **Recommendation:** E. B alone still answers `ready` from a removed row, against the rule that any missing image fails the deploy run.
- **Action:** fix after merge, apply E, because the case is rare and its fix does not get harder after the merge.
