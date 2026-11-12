# Get started for a person whose orgs are all deleted

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the options check of `plans/follow-ups/get-started-returning-member.md`. Its report is in `.context/options-check/report.md`.
- **Location:** `setupOrg` in `src/app/setup-steps.ts`, `OpenApp` in `src/shell/Shell.tsx`, the end of Delete org in `src/shell/settings/GeneralTab.tsx`, `GetStartedScreen` in `src/shell/onboarding/GetStartedScreen.tsx`, and the Delete org section of `docs/protocol/orgs-and-members.md`.
- **Reason:** no requirement says how a person whose orgs are all deleted reaches Restore from Get started on a phone.

- **Terms:**
  - **Get started:** the first-run page with three steps: install the GitHub App, create an org, and connect Claude or Codex. It is also the page of a person with no org.
  - **Deleted org:** an org that an admin deleted. An admin can restore it for 7 days.
  - **Deleted orgs section:** the last section of the General tab of the Account page. It lists each deleted org with Restore.
- **Background:**
  - On 12 November 2026 the user asked that deleted orgs leave the org rail, and that Restore moves to the Account page. Branch `calummoore/porto-a8k1` made that change.
  - That branch also counts a person whose orgs are all deleted as a person with no org. So the address `/` and the end of Delete org of the last org open Get started, and its org step offers Create org again. This was a design call of the agent, not of the user.
  - Before that branch, Get started counted a deleted org as an org. The org step showed done, with two load failures that Try again could not clear, and the address `/` opened the page of the deleted org with Restore.
  - On a desktop, Get started shows the org rail, which links to the Account page. On a phone, and in a narrow window of the Mac app, Get started shows only a header and the steps. It has no link to the Account page, no org sheet, and no button that opens the palette.
  - The address of a deleted org still opens its page with Restore.
- **Problem:** An admin on a phone whose orgs are all deleted lands on Get started. That page has no way to the Account page, so it has no way to Restore. Only Back, or a typed address such as `/account`, leads there.
- **Impact if no action:** A phone-only admin may not find Restore during the 7 days. Then everything of the org is deleted.
- **Root question:** How does a person whose orgs are all deleted reach Restore on every layout?
- **Options:**
  - **A.** When every org of the person is deleted, let `/` and the end of Delete org open the page of a deleted org, as before the branch. Keep deleted orgs out of the rail, the phone sheet, and the keys. That page has Restore, and its phone header leads to Create org and Account. A person who wants a new org sees the deleted page first. Get started keeps its two load failures for that person. Effort: Small.
  - **B.** Give the phone layout of Get started a link to the Account page, as the rail gives on a desktop. This needs a phone mockup of Get started. Effort: Medium.
  - **C.** Show the Deleted orgs list with Restore on Get started, above the org step, while the person has a deleted org. Reuse `DeletedOrgList` of the mockups. This needs a mockup and a protocol line. Effort: Medium.
- **Left out:** No change, because a new session or the Mac app has no Back history to the page of the deleted org.
- **Wider fix:** B. It gives every first-run case on a phone a way to the Account page.
- **Previous examples:** finding 12 of PR #52 kept the Restore page reachable from Get started.
- **Recommendation:** C. Restore then shows on the page where the person lands, on every layout, and the org step stays true.
- **Action:** ask the user, because the options have real trade-offs. A puts a deleted page in front of a person who may want a new org, and B and C add new screens that need a mockup.
