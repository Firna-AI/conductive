# Rebase the larger software image plan on main

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, the post-merge tasks of the plan `plans/first-build-software-image.md`, branch `calummoore/global-snapshot-simplification`.
- **Location:** `plans/software-image.md` on branch `calummoore/build-image-install-order`.
- **Reason:** the larger plan must start from the merged smaller change, so the update waits for that merge.

- **Terms:**
  - **Software image:** one saved snapshot for each version of the app's own software, which holds no org data. Each deploy run asks the Worker to build it, and a first build of an org starts from it. `docs/protocol/org-image.md` gives its rules.
  - **Larger plan:** `plans/software-image.md` on branch `calummoore/build-image-install-order`. It plans the software image together with clean later builds, a daily refresh that updates old org images, the update of old workspaces at a workspace start, the copy of a missing repository at a first workspace start, and a notice of an old org setup.
- **Background:**
  - On 10 November 2026, the user chose a smaller first step: build the software image in each deploy run, and start only first builds from it. Later builds and refreshes keep their steps.
  - The smaller change implements these decisions of the larger plan: 2 B, a software image for each app software version; 3 C, the deploy run asks the Worker to build it and waits; 5 F, the deploy run fails unless the image is ready; and 6 D, a token for each deploy run with only its digest on the Worker.
  - The smaller change has its own design calls, which differ from the larger plan in two places. The requests of the deploy step and the 15-minute Cron Trigger move a build on, with no coordinator object. The deploy route compares the token digest of the request, not the version tag, to tell an older Worker version apart.
  - The larger plan still names its open decisions: 1, the label of the software step; 12, when a daily refresh runs the install script; and 13, how an added repository becomes usable.
- **Task:**
  - Merge `main` into `calummoore/build-image-install-order`.
  - Mark Milestones 3 to 7 of the larger plan done where the smaller change covers them, and record the two design differences above.
  - Rewrite the remaining milestones so that they build on the `worker/software-image/` area and on the `software_images` table.
  - Keep each open decision of the larger plan open, with its recorded number and letters.
- **Impact if no action:** The larger plan describes code that already exists in another shape, so its next implementor can build a second software image path.
- **Needs:** the merged smaller change on `main`.
- **Done when:** `plans/software-image.md` on its branch starts from `main`, marks the done work, and plans only the remaining work.
