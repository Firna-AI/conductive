# Users lack terms, suspension, and abuse reports

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-05, from `calummoore/conductor-alternative-architecture`, plan decision 28, option D.
- **Location:** `src/marketing/chrome.ts`, the footer of the marketing site, and `src/marketing/legal.ts`, the draft terms. The sign-up flow and an operator action in the Worker do not exist yet.
- **Reason:** The user chose a lighter sign-up check for the first release on 5 November 2026, and asked to add this work after it.

- **Terms:**
  - **Boat:** the provider of the app's cloud computers.
  - **Boat organization:** the app's own Boat team account. All users' cloud computers run in it, and it has one wallet and one pool of starts.
  - **Operator:** the person who runs the app, today its owner, as opposed to the owner of an org inside the app.
- **Background:**
  - Anyone with a GitHub account older than 30 days and a verified email can sign up. The user decided this on 5 November 2026.
  - Every user gets cloud computers with root access in the app's Boat organization.
  - Port previews still show sandbox content under the app's own preview domain.
  - Boat cannot block outbound traffic from a sandbox. A user with root can remove firewall rules inside their machine.
  - Boat's terms allow a platform to run sandboxes for its own users, and make the platform responsible for what its users do. A check of Boat's terms on 5 November 2026 found that a platform must pass Boat's rules on to its users, enforce them, and answer abuse notices.
- **Problem:** The app shows users no terms, has no way to suspend a user, and gives no address for abuse reports.
- **Impact if no action:** One abusive user, for example one who sends spam or scans other hosts, can get the app's whole Boat organization suspended. That stops every user's cloud computers. A preview that serves abusive content also puts the app's preview domain at risk.
- **Changed on 6 November 2026:** decision 44 moved the cloud computers into each org's own Boat account, and decision 80 moved them back to the app's Boat organization the same day. Decision 81 keeps the product free with no limits. Decision 82 keeps this item after the merge. Milestone 15d built the marketing site footer and the draft terms.
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
