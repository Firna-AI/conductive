# A verbose failed start can fail to return its log

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, round 2 check of review finding 8.
- **Location:** `worker/lifecycle/start-logs.ts:41`, `worker/lifecycle/start-storage.ts:220`, `worker/lifecycle/masked-start-log.ts:9`
- **Reason:** the code is unchanged against `origin/main`; the disk hold branch did not cause it.

- **Terms:**
  - **Start log:** the output of a workspace start that the app shows when the start fails.
  - **Mask:** the step that hides secret values in the start log before the app sees it.
- **Background:** The Worker stores all start output with no size limit, then joins and masks all of it in one pass when it reads a failed start's log.
- **Problem:** A check measured the mask in Node with a 128 MB heap: it used 151 MB for 4 MB of output and ran out of memory at 8 MB.
- **Impact if no action:** A verbose failed start can fail to return its log, so the member cannot see why the start failed.
- **Root question:** How does a failed start return its log, whatever the size of its output?
- **Options:**
  - **A.** Mask in bounded chunks with an overlap of the longest secret, and stream the result. Effort: Medium.
  - **B.** Keep only the last part of the start output, with a note that the start cut it. Effort: Small.
- **Left out:** A larger heap, because the Worker's memory is fixed.
- **Wider fix:** A.
- **Previous examples:** `worker/lifecycle/build-log-retention.ts` bounds build logs.
- **Recommendation:** A, because it keeps the whole log and bounds memory.
- **Action:** ask the user, because B changes the log that members see.
