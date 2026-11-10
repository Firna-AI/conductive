# Get started shows load failures for a deleted org

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the options check of `plans/follow-ups/get-started-returning-member.md`. Its report is in `.context/options-check/report.md`.
- **Location:** `setupOrg` in `src/app/setup-steps.ts`, the finish in `src/shell/onboarding/GetStartedScreen.tsx` (`Finish`), and the cloud computer line of the org step at `src/shell/onboarding/OrgStep.tsx:69-72`.
- **Reason:** no requirement says whether a deleted org completes the org step of Get started.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex.
  - **Deleted org:** an org that an admin deleted. An admin can restore it for 7 days.
- **Background:** Get started follows the org list, also a deleted org, so that the admin of a deleted org keeps its Restore page (finding 12 of PR #52). The org step also shows the cloud computer of the org, and the finish takes its words from the builds of the org: ready, still being prepared, did not build, or needs a build. The Worker refuses each read of a deleted org with HTTP 404 and "The org is not available.".
- **Problem:** For an admin whose only org is deleted, the org step shows done, with two load failures: "The repositories didn't load" and "The cloud computer didn't load", each with Try again that cannot succeed. After the agent connects, the finish shows the Open button of the deleted org with no words, because the builds never load.
- **Impact if no action:** The admin sees two failures that Try again cannot clear, and no words that say that the org is deleted. The link leads to the Restore page, so nothing breaks.
- **Root question:** What does Get started show to a person whose only org is deleted?
- **Options:**
  - **A.** Keep the org step done, and give a deleted org its own org step and finish text that name the deleted state, show no load failures, and link to Restore. Effort: Small.
  - **B.** Count a deleted org as no org. The org step opens Create an org, and Restore stays on the page of the org. Effort: Small.
- **Left out:** No change, because the page then keeps two failures that cannot clear.
- **Wider fix:** None. The rule of `plans/follow-ups/get-started-returning-member.md` keeps the words of the page true.
- **Previous examples:** finding 12 of PR #52.
- **Recommendation:** A. It keeps the Restore path that finding 12 chose, and the words become true.
- **Updated:** 2026-11-09, by the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`: the org step now shows the cloud computer, and the finish takes its words from the builds, so a deleted org shows load failures in place of the word "ready".
- **Action:** ask the user later, because the user deferred this choice on 8 November 2026. No requirement says what Get started shows for a deleted org.
