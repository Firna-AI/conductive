# E2B workspaces have no disk line

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, the post-merge task of the plan for the workspace disk hold.
- **Location:** `worker/sandbox/accounts.ts`
- **Reason:** E2B documents no restore limit, so the line value is not known yet.

- **Terms:**
  - **Disk line:** the used size of the disk of `/` where every write stops, so that a saved disk always fits a resume. The Worker sends it as `CONDUCTIVE_DISK_LINE_BYTES` for each provider account that has one.
- **Background:** Boat accounts get a line of 72,000,000,000 bytes: Boat's base usage of 21.95 GB plus its documented 51 GB of own files. E2B accounts get no line, so their sandboxes hold nothing. The E2B project disk is about 15 GB.
- **Problem:** Nobody knows what happens when an E2B sandbox fills its disk before a pause, or whether a full disk can block its resume.
- **Impact if no action:** If E2B has a limit like Boat's, an E2B workspace can get stuck the same way, with no protection.
- **Root question:** Does an E2B workspace need a disk line, and at what size?
- **Options:**
  - **A.** Test a full disk on a throwaway E2B sandbox across a pause and a resume. Set a line for E2B only if the test shows a limit. Effort: Medium.
  - **B.** Ask E2B for its documented limit, then set the line from the answer. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A line for E2B with no evidence, because it can stop work for no reason.
- **Wider fix:** None.
- **Previous examples:** The Boat incidents of 2026-11-20 and 2026-11-26.
- **Recommendation:** A, because it gives a measured answer.
- **Action:** ask the user, because a line changes how much E2B members can write.
