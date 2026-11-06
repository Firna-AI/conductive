# A used preview grant still works for 60 seconds

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #20, branch `conductor/boat-native-remote-workspaces-milestone-11a`, round 1 finding 5. The user sees it as item 95.
- **Location:** the preview authorizer in `worker/previews/`.
- **Reason:** each fix that makes a grant work once refuses its second use, and a new refusal is the user's choice.

- **Background:** Decision 83 C moved the preview credential into a cookie. To open a preview, the app gives the frame or the new tab a launch link with a 60-second grant. The authorizer exchanges the grant for the cookie.
- **Problem:** The exchange does not use up the grant. The same link works again until the grant expires.
- **Impact if no action:** Anyone who gets a used launch link within 60 seconds, for example from a shared screen or the browser history, can open the preview in another browser, and keeps access until the preview expires.
- **Root question:** How does a launch link open a preview for one browser only?
- **Options:**
  - **D.** Keep the reusable 60-second grant, as the protocol records it. Effort: Small.
  - **B.** One redemption operation uses up the grant and returns the cookie, for the frame and the new tab. It uses the one-use records that GitHub sign-in and the Mac handoff already use, after every other check passes. A second use gets 404. Effort: Small.
  - **C.** The workspace Durable Object issues and uses up the grants. Effort: Medium.
- **Left out:** A record only at the exchange, because it gives the sign-in records a second meaning or needs a new table, with no gain over B.
- **Wider fix:** B.
- **Previous examples:** The Mac handoff in `worker/security/desktop-auth.ts`, which uses its grant once.
- **Recommendation:** B.
- **Action:** ask the user, because B refuses the second use of a grant.
