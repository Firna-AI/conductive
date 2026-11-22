# An answer can push Mac settings past one frame

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/mac-permission-issue-o7fv`, review round 1, a finding check.
- **Location:** `desktop/src/device/session.ts` (the answers Always allow, 15 minutes, and until Stop), `desktop/src/device/settings.ts` (the size check of a settings reply).
- **Reason:** The same behaviour is on `main`, and the branch that found it fixed only the settings changes that it adds.

- **Terms:**
  - **Device frame:** one message between the Worker and the Mac app, at most 1,000,000 bytes.
  - **Settings reply:** the reply of the Mac app to a read or a change of its settings. It carries the always-allowed commands and the grants.
- **Background:** The always-allowed commands have a budget of 900,000 bytes. The grants have no limit. A settings reply that does not fit in one device frame becomes `settings.failed` with `settings_result_too_large`.
- **Problem:** An answer to a request (Always allow, 15 minutes, or until Stop) adds a permission without a check of the next settings reply. When the reply then passes one frame, every later read fails, so This Mac, the bar, and the line cannot show the running grants.
- **Impact if no action:** A member cannot see or stop a grant in the page, and must quit the Mac app to end it.
- **Root question:** How does the page always see each grant that runs on this Mac?
- **Options:**
  - **A.** Refuse an answer that would make the settings reply too large, with a cause and a next step. It adds a rejection, which needs the user. Effort: Medium.
  - **B.** Send the grants apart from the always-allowed commands, so the bar and the line read only the grants. It changes the settings protocol in three packages. Effort: Large.
- **Left out:** A larger frame, because it only moves the limit and breaks older Mac apps.
- **Wider fix:** B.
- **Previous examples:** The 900,000-byte budget for always-allowed commands came from the same class of failure.
- **Recommendation:** A. It keeps one frame and keeps each grant visible, at less cost.
- **Action:** ask the user, because A adds a rejection.
