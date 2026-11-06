# File read size refusals can give the wrong answer

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #3, branch `conductor/boat-native-remote-workspaces-milestone-9`, finding 3 and a new problem of its check.
- **Location:** `worker/sandbox/file-read.ts:48` and the error mapping of the Boat file read in `worker/sandbox/`.
- **Reason:** the defect needs a file over Boat's 5 MiB read cap, opened while the sandbox runs but its runner is not connected, so the fix rule defers it.

- **Terms:**
  - **Fallback read:** the Worker's read of a file through Boat's file route, when the agent runner of the cloud computer is not connected.
  - **`files/info`:** the Boat route that gives the size of a file without its content.
- **Background:** The fallback read reads the JSON body of Boat's file route with a byte budget. When the body passes the budget, it calls `files/info` and answers `file_too_large` with the size. Boat documents "Files up to 5 MiB" for its read and gives no status for a larger file.
- **Problem:**
  - A Boat refusal of a file over 5 MiB can come with a small error body. Probes with HTTP 400, 413, and 502 skipped `files/info` and answered with a generic provider error, which the app shows as "try again".
  - After a body passes the budget, the adapter answers `too_large` without a check that the size from `files/info` is above the limit. A larger Boat envelope, or a file that shrinks between the two calls, then gives `file_too_large` with a size at or below the limit.
- **Impact if no action:** The user sees "try again" for a file that can never open through the fallback, or a wrong size in the "too large" message.
- **Root question:** How does the fallback read answer `file_too_large` exactly when the file is over the limit, whatever Boat's refusal looks like?
- **Options:**
  - **A.** Read `files/info` after a content failure, before the error mapping. Answer `file_too_large` when the size is over the configured limit. Keep the other safe errors. Effort: Small.
  - **B.** Check `files/info` against both the configured limit and Boat's 5 MiB cap before every read, and keep A's recovery. This adds a call to every read and answers `file_too_large` for a file that the runner can open. Effort: Small.
  - **C.** A, and after a budget overflow answer `file_too_large` only when the size from `files/info` is above the limit. Otherwise answer the read error. It needs neither Boat's refusal shape nor its cap value. Add regressions for a file over 5 MiB with a small refusal body, and for an overflow with a size at the limit. Effort: Small.
- **Left out:** None.
- **Wider fix:** C. It still works when Boat changes its refusal shape or its cap.
- **Previous examples:** finding 1 of PR #3, the unbounded body read that the bounded reader fixed.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because the defect needs a rare timing and a file over Boat's cap.
