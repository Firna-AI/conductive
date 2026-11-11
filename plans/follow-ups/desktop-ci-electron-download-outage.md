# Desktop CI fails when GitHub release downloads time out

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the CI of pull request #91, branch `calummoore/tool-calls-and-thinking-collapse`.
- **Location:** the Desktop workflow of `.github/workflows/` (the "Mac app" jobs), at the steps `npm --prefix desktop run test:electron` and `npm --prefix desktop run package`.
- **Reason:** the fix changes a CI workflow file, and the choice between a cache and no change waits for the user.

- **Terms:**
  - **Desktop workflow:** the GitHub Actions workflow that tests and packages the Mac app in `desktop/` on macOS runners.
  - **Electron download:** the zip of the Electron binary that `@electron/get` and electron-builder fetch from `https://github.com/electron/electron/releases/download/v44.10.2/` before the tests and the package step run.
- **Background:** Each run of the Desktop workflow downloads the Electron zip for its runner, such as `electron-v44.10.2-darwin-arm64.zip` and `electron-v44.10.2-darwin-x64.zip`. On 9 November 2026, between about 04:50 and 06:28 UTC, GitHub answered these downloads with `HTTPError: Response code 504 (Gateway Time-out)`.
- **Problem:** The Desktop workflow failed on `main` and on several pull requests at the same time, with no change of the code. The run of pull request #91 (run 42571483241) failed at `test:electron` with "Electron failed to install correctly" after the 504 errors. Its one rerun of the failed jobs failed at `npm --prefix desktop run package` with "Response code 504 (Gateway Time-out) failedTask=build". The run of `main` at `fc36467` (run 42564090173) failed the same way on the Intel runner. A download of the same zip worked again at 06:30 UTC. On 11 November 2026 at 00:09 UTC, the Intel run of pull request #176 (run 42929107129) failed at `test:electron` the same way, after `HTTPError: Response code 502 (Bad Gateway)` for `electron-v44.10.2-darwin-x64.zip`. The Desktop run of the next commit of that branch, `4d3ebca6`, passed.
- **Impact if no action:** Each outage of the GitHub release downloads turns the Desktop check red on every open pull request and on `main`, until someone reruns it.
- **Root question:** How does the Desktop workflow keep working when the Electron download times out?
- **Options:**
  - **A.** Change nothing, and rerun the Desktop workflow after an outage ends. Effort: Small.
  - **B.** Cache the Electron download in the Desktop workflow, keyed by the Electron version and the runner architecture, so that a run downloads it only on a cache miss. The workflow file changes, so the user reviews and merges it. Effort: Small.
  - **C.** Download Electron from a mirror through `ELECTRON_MIRROR`. This changes a download URL and trusts another host. Effort: Small.
- **Left out:** A retry loop around the download, because it only waits out a short outage, and B removes most downloads.
- **Wider fix:** B. A cache removes the dependence on the download for most runs.
- **Previous examples:** The 502 failure of 11 November 2026 in the Desktop run of pull request #176, as the problem says.
- **Recommendation:** B. It keeps the check green through short outages, with no new host to trust.
- **Action:** ask the user, because the fix changes a CI workflow file, and no option is clearly best between no change and a cache.
