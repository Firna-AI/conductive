# Old replies can stop a newer build log

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #16, branch `conductor/boat-native-remote-workspaces-milestone-6`, finding 3.
- **Location:** `ComputerModel` and the build log view of the org settings in `src/shell/settings/`.
- **Reason:** it needs a late reply for an older build after a newer build starts.

- **Terms:**
  - **Build log:** the output of an org image build, which the cloud computer tab of the org settings shows while the build runs.
- **Background:** The org settings show the log of the newest build and refresh it every 2 seconds while it runs. The view chooses the build, and the model fetches its log with one request generation.
- **Problem:** The model keeps the same request generation when the chosen build changes. A late reply for build A can replace build B's log and cancel B's timer.
- **Impact if no action:** After a failed build and a new build, the tab can show the old log and stop refreshing.
- **Root question:** How does only the current build write the log and own the timer?
- **Options:**
  - **A.** Start a new request generation when the chosen build changes. Effort: Small.
  - **B.** Key each request and the timer by the build ID, and drop replies for another build. Effort: Small.
  - **D.** The model follows the newest build itself: at each change of the target build, it replaces one follower that owns the requests and the timer of that build's log. The view only reads the log. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. A new caller or a new order of replies cannot bring the defect back.
- **Previous examples:** None found.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because it needs unusual reply timing.
