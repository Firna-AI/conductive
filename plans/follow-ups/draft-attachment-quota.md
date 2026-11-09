# No limit on the draft files of one user

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the options check of decision 144. Its report is in `.context/options-check-144/report.md`.
- **Location:** the attachment upload routes of Milestone 8p.
- **Reason:** a limit adds a new refusal, so the user must decide.

- **Background:** Decision 132 A keeps an unsent draft file for 7 days. Milestone 8p builds the upload routes. A signed-in user can upload a file before a workspace exists.
- **Problem:** No rule limits the number or the total size of the stored files of one user.
- **Impact if no action:** One account can fill the bucket with draft files that stay for 7 days, which costs storage.
- **Root question:** How much can one user store as files that no message uses yet?
- **Options:**
  - **A.** Change nothing, and watch the bucket size. Effort: Small.
  - **B.** Refuse a new upload when the unsent files of the user pass a total size, such as 250 MB. Effort: Small.
- **Left out:** A shorter keep time alone, because one account can still fill the bucket within it.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. It bounds the cost of one account.
- **Action:** ask the user later, because B adds a new refusal.
