# Operator writes need no fresh sign-in

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from Milestone 2 of the operator section plan on branch `calummoore/admin-section-brainstorm`, open question 2 of its docs work.
- **Location:** the operator check of `worker/operator/route.ts`, and "The operator section" in `docs/protocol/operator-section.md`.
- **Reason:** It adds a new gate on the operator routes, which only the user can approve, and the operator section works without it.

- **Terms:**
  - **Operator:** a person whose numeric GitHub ID is in the Worker setting `OPERATOR_GITHUB_IDS`. Only an operator opens the operator section and suspends or lifts.
  - **Sign-in session:** the signed session cookie of the app, which lasts up to 7 days.
  - **Fresh sign-in:** a GitHub sign-in from a short time before a request, such as the last hour.
- **Background:**
  - On 8 November 2026 the user chose an operator section inside the web app, behind the normal sign-in and the operator check. The options check of that choice also offered a fresh sign-in for operator power. It kept the normal session, because the first version only read counts, and said that a fresh sign-in fits the first write action.
  - The same day the user put Suspend and Lift on the page of each org and user. Those are write actions.
  - The suspend routes already accept the normal session, also before this change.
  - The `sessions` table stores no sign-in time, only `expires_at`.
  - On 9 November 2026 the user chose a waitlist, which the operator controls from the section. It adds more operator writes: Approve a person who waits, make and disable invite codes with any use limit, and pause every way in. An approval or an invite code lets new people use the app, which pays for their cloud computers.
- **Problem:** One stolen operator session cookie gives up to 7 days of operator power: it can suspend or lift any user or org, let any number of people in, pause sign-ups, and read the names and roles of every user.
- **Impact if no action:** A stolen cookie of an operator can lift the suspension of an abuser, suspend a whole org, or make an invite code with a large use limit.
- **Root question:** How much operator power does one long-lived session cookie give?
- **Options:**
  - **A.** Keep the normal session for every operator request, as now. Effort: Small.
  - **B.** Ask for a fresh GitHub sign-in before each operator write only: Suspend, Lift, Approve, the invite codes, and the pause. The app must store the sign-in time of each session. Effort: Medium.
  - **C.** Ask for a fresh GitHub sign-in before every operator request, the reads included. Effort: Medium.
- **Left out:** A separate hostname behind Cloudflare Access, because the user chose the section inside the web app on 8 November 2026.
- **Wider fix:** C. Every later operator request then needs a fresh sign-in too.
- **Previous examples:** None found.
- **Recommendation:** B. It guards the actions that change other people's access, and the reads stay quick. C protects the codebase best.
- **Action:** ask the user, because B and C add a new gate, and the options trade effort against the risk of a stolen session.
