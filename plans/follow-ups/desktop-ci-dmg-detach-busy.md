# Intel Mac packaging can fail to detach its disk

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the CI of pull request #161, branch `calummoore/markdown-formatting-issue`.
- **Location:** the Desktop workflow of `.github/workflows/` (the job "mac / Mac app macos-15-intel"), at the step `npm --prefix desktop run package`.
- **Reason:** the failure came from the macOS runner while it built the disk image, and pull request #161 changes no file of the Mac app or of its workflow.

- **Source:** Review. **Category:** Process.
- **Terms:**
  - **Desktop workflow:** the GitHub Actions workflow that tests and packages the Mac app in `desktop/` on macOS runners.
  - **DMG:** the disk image of the Mac app, which electron-builder builds with `dmgbuild` and the macOS tool `hdiutil`.
- **Background:**
  - On 10 November 2026, run 42807738566 of the Desktop workflow failed in its Intel job at the package step, on commit `bfd3eadd` of pull request #161. The Apple silicon job of the same run passed.
  - The log said: `dmgbuild.core.DMGError: Unable to detach device cleanly: hdiutil: couldn't eject "disk2" - Resource busy`, then `dmgbuild process failed 1`.
  - The next run of the same workflow, 42824283022 on the merge commit `03b44c7b` of the same pull request, passed both jobs. The failed job was not rerun on its own commit.
  - The item `plans/follow-ups/desktop-ci-electron-download-outage.md` records another cause of failures at the same step: timeouts of the Electron download.
- **Problem:** The Intel package step can fail when `hdiutil` cannot eject the disk image that it just built, because another process on the runner still uses it.
- **Impact if no action:** A pull request can show a red Desktop check for a cause outside its change, and someone must rerun the job.
- **Root question:** How does the Desktop workflow build the disk image on a runner that sometimes keeps the image busy?
- **Options:**
  - **A.** Change nothing, and rerun the job when it fails. Effort: Small for each failure.
  - **B.** Retry only the DMG build of the package step once, after a short wait for the disk to free, and keep every other failure red. Effort: Small.
  - **C.** Build the disk image in a separate step that ejects the disk with a retry, and stop the processes that hold it, such as Spotlight indexing of the image. Effort: Medium.
- **Left out:** A retry of the whole job, because it also hides real failures of the tests and of the package.
- **Wider fix:** C. It removes the busy disk instead of retrying past it.
- **Previous examples:** None found for this error.
- **Recommendation:** B. A single retry of the DMG build covers a runner flake at a Small cost, and it hides no other failure.
- **Action:** ask the user, because B and C change a CI workflow and add a retry, which the user decides.
