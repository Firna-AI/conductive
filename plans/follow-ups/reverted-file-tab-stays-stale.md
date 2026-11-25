# A reverted file can leave its tab stale

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the check of review finding 25 of round 7 found.
- **Location:** `crates/cnd-runner/src/reports/updates.rs:122` and `crates/cnd-runner/src/watcher/service.rs:147`.
- **Reason:** `main` has the same behaviour, and the runner file report limits change did not alter it.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** See the header.
- **Terms:**
  - **Tree scan:** The runner scan that builds the next file tree report. The watcher starts it 100 ms after the last file event, and after any scan that is running.
  - **Refresh:** A tree update that makes each open file or diff tab read its file again.
- **Background:** The runner refreshes an open file when the next tree scan finds that its content changed. A file tab can read the file at any time between two scans.
- **Problem:** When a file changes, a tab reads the new bytes, and the file then returns to its earlier bytes before the next tree scan, that scan sees the same content as the scan before. The runner sends no refresh, and the tab keeps the bytes that it read in between.
- **Impact if no action:** An open file tab can show content that no longer exists until the member opens the file again.
- **Root question:** How does an open file tab show the current bytes after its file changes and returns between two tree scans?
- **Options:**
  - **A.** Record the readable identity of each file that the runner serves to a tab. At each tree update, refresh each recorded path whose identity differs from the new scan, then clear the record. Needs a protocol rule, and a capped read must still give the identity of the whole file. Effort: Large.
  - **B.** Make the app read an open file again when its tab becomes visible. Older readers keep the gap. Effort: Medium.
- **Left out:** A shorter watcher delay narrows the window but does not close it.
- **Wider fix:** A.
- **Previous examples:** Review finding 25 of the same branch fixed the case that a Changes-only repair caused.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the behaviour is on `main` and is outside the scope of the change that found it.
