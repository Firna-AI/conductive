# Get started calls a deleted org ready

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the options check of `plans/follow-ups/get-started-returning-member.md`. Its report is in `.context/options-check/report.md`.
- **Location:** `setupOrg` in `src/app/setup-steps.ts`, and the finish text at `src/shell/onboarding/GetStartedScreen.tsx:58`.
- **Reason:** no requirement says whether a deleted org completes the org step of Get started.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex.
  - **Deleted org:** an org that an admin deleted. An admin can restore it for 7 days.
- **Background:** Get started follows the org list, also a deleted org, so that the admin of a deleted org keeps its Restore page (finding 12 of PR #52). When every step is done, the page says "<org> is ready for a new workspace" and links to the org.
- **Problem:** For an admin whose only org is deleted, the org step shows done, and after the agent connects, the page says that the deleted org is ready for a new workspace.
- **Impact if no action:** The admin reads a wrong claim. The link leads to the Restore page, so nothing breaks.
- **Root question:** What does Get started show to a person whose only org is deleted?
- **Options:**
  - **A.** Keep the org step done, and give a deleted org its own finish text that names the deleted state and links to Restore. Effort: Small.
  - **B.** Count a deleted org as no org. The org step opens Create an org, and Restore stays on the page of the org. Effort: Small.
- **Left out:** No change, because the page then keeps a wrong claim.
- **Wider fix:** None. The rule of `plans/follow-ups/get-started-returning-member.md` keeps the words of the page true.
- **Previous examples:** finding 12 of PR #52.
- **Recommendation:** A. It keeps the Restore path that finding 12 chose, and the words become true.
- **Action:** ask the user later, because the user deferred this choice on 8 November 2026. No requirement says what Get started shows for a deleted org.
