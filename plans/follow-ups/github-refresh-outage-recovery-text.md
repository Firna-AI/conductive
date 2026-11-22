# GitHub outages suggest a new sign-in

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the options check of branch `calummoore/oslo-3u7a`.
- **Location:** `worker/security/github-refresh.ts:34`, `src/app/skills-lookup.ts`.
- **Reason:** The repository trust change does not change GitHub sign-in recovery.

### 1. GitHub outages suggest a new sign-in

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Review.
- **Category:** UX wording.
- **Terms:**
  - **Worker:** Conductive's server, which refreshes the signed-in member's GitHub token before it reads GitHub.
- **Background:** The Skills section uses the viewer's GitHub token to read the saved skills repository. A failed token refresh replaces the lookup result with an error.
- **Problem:** Every refresh failure gives `github_refresh_failed` and "GitHub access failed. Sign in with GitHub again." This includes network failures, HTTP failures, and invalid token replies. A new sign-in cannot repair a GitHub outage.
- **Impact if no action:** Members can sign in again unnecessarily while GitHub remains unavailable. A future skills copy status in the lookup reply also stays hidden during this failure.
- **Root question:** How do members get useful recovery steps when GitHub access fails?
- **Options:**
  - **A.** Keep the current error code. Explain both retry and sign-in recovery in its message. Effort: Small.
  - **B.** Separate temporary GitHub failures from invalid or expired credentials. Reuse the app's retry and reconnect errors where their contracts apply. Confirm the required recovery with the protocol before implementation. Effort: Small.
  - **C.** Move skills copy status to a separate read that does not need GitHub. This preserves the incorrect sign-in message elsewhere. Effort: Medium.
- **Left out:** Retrying forever hides the error and delays the member. Returning a successful empty lookup hides an unavailable source.
- **Wider fix:** B puts the recovery choice at the shared token boundary.
- **Previous examples:** `docs/protocol/github-tokens.md` requires a retry message for other Git failures because a new sign-in cannot help every failure.
- **Recommendation:** B. It can give the same correct recovery to every token consumer. Check the boundary contract before changing responses.
- **Action:** fix after merge, apply B, because the token recovery boundary is outside repository trust.
