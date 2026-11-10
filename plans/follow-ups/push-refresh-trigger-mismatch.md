# The push refresh trigger disagrees with the code

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from Milestone 2 of the plan `plans/added-repository-builds.md`, branch `calummoore/new-repo-build-recreation`.
- **Location:** `docs/protocol/org-image.md` (the line "A push to the default branch of a chosen repository refreshes the org image"), `docs/architecture/flows.md` (section "GitHub events"), `refreshImagesForPush` and `pushedImageRepositories` in `worker/lifecycle/image-timers.ts`.
- **Reason:** the docs and the code disagreed on `origin/main` before that plan, which changed only what a refresh fetches and when an added repository builds.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Org image:** the saved snapshot that every new cloud computer of an org starts from.
  - **Refresh:** an update of the org image that fetches the new commits of each repository that the org image holds. It runs no install script.
  - **Waiting repository:** a repository that the org chose and that the org image does not hold yet.
- **Background:**
  - `docs/protocol/org-image.md` and `docs/architecture/flows.md` say that a push to the default branch of a chosen repository refreshes the org image.
  - `refreshImagesForPush` in `worker/lifecycle/image-timers.ts` refreshes only for a repository that the org image holds, as `worker/lifecycle/image-builds.md` says.
  - Since 2026-11-10, an added repository starts its own build, and a refresh fetches only the repositories that the org image holds.
- **Problem:** In the code, a push to a waiting repository starts no refresh, and a push to a removed repository that the org image still holds starts one. The docs say the opposite for both cases.
- **Impact if no action:** A review flags the mismatch again. A reader can expect a refresh from a push to a waiting repository.
- **Root question:** Which pushes refresh the org image?
- **Options:**
  - **A.** Change both docs to "a repository that the org image holds", as the code does. Effort: Small.
  - **B.** Change the code to refresh on a push to each chosen repository, and not to a removed one. A push to a waiting repository then leads to the added build that a refresh starts. Effort: Medium.
- **Left out:** No change, because the docs would still contradict the code. Only two approaches are real, because the docs and the code must agree on one trigger.
- **Wider fix:** None. The `documentation` skill already requires that the docs match the code.
- **Previous examples:** None found.
- **Recommendation:** A. A refresh fetches only the repositories that the image holds, so a push to a waiting repository gives the image nothing, and the add already builds that repository.
- **Action:** ask the user, because A changes a stated requirement, and the user decides which side is right.
