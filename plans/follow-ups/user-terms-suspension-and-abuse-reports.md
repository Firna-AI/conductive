# Users lack terms, suspension, and abuse reports

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-05, from `calummoore/conductor-alternative-architecture`, plan decision 28, option D.
- **Location:** `src/marketing/chrome.ts`, the footer of the marketing site, and `src/marketing/legal.ts`, the draft terms. The sign-up flow and an operator action in the Worker do not exist yet.
- **Reason:** The user chose a lighter sign-up check for the first release on 5 November 2026, and asked to add this work after it.

- **Terms:**
  - **Boat:** the provider of the app's cloud computers. The app names it only on the Boat key screen and its tab, on the marketing site, and in Get started.
  - **Boat key:** the key of an org's own Boat account. Since decision 44, each org adds its own key, and its cloud computers run in that account.
  - **Operator:** the person who runs the app, today its owner, as opposed to the owner of an org inside the app.
- **Background:**
  - Anyone with a GitHub account older than 30 days and a verified email can sign up. The user decided this on 5 November 2026.
  - Every user gets cloud computers with root access. Since decision 44 of 6 November 2026, they run in the org's own Boat account, not in an account of the app.
  - Port previews still show sandbox content under the app's own preview domain.
  - Boat cannot block outbound traffic from a sandbox. A user with root can remove firewall rules inside their machine.
  - Boat's terms allow a platform to run sandboxes for its own users, and make the platform responsible for what its users do. A check of Boat's terms on 5 November 2026 found that a platform must pass Boat's rules on to its users, enforce them, and answer abuse notices.
- **Problem:** The app shows users no terms, has no way to suspend a user, and gives no address for abuse reports.
- **Impact if no action:** One abusive user, for example one who sends spam or scans other hosts, can get their own org's Boat account suspended. A preview that serves abusive content puts the app's own preview domain at risk.
- **Changed on 6 November 2026:** decision 44 moved the cloud computers into each org's own Boat account, and Milestone 15d built the marketing site footer and the draft terms. The options below date from before that change, so check them again before the work starts.
- **Root question:** How does the app keep every user within Boat's rules?
- **Options:**
  - **A.** Keep only the sign-up check on account age and verified email. Effort: Small.
  - **D.** Add three things:
    - terms that each user accepts at sign-up, which pass on Boat's acceptable-use rules
    - an operator action that suspends a user, stops all of their cloud computers, and blocks new starts
    - an address for abuse reports in the marketing site footer and the terms

    Effort: Small.
- **Left out:** A payment card for free accounts, because the user chose the account-age check on 5 November 2026.
- **Wider fix:** D.
- **Previous examples:** None found.
- **Recommendation:** D. Boat's terms require it, and it protects every user from one bad actor.
- **Action:** fix after merge, apply D, because the user asked on 5 November 2026 to add it after the first release.
