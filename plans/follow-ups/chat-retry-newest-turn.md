# An old Try again can send an older message again

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #24, branch `conductor/boat-native-remote-workspaces-milestone-8j`, a problem outside the scope that the check of round 1 finding 2 found.
- **Location:** `worker/chat/http-routes.ts:204`.
- **Reason:** the fix refuses a retry that is not the newest, and a new refusal is the user's choice.

- **Background:** Try again on a failed turn sends its message again through the retry route of the workspace.
- **Problem:** The route checks only that the earlier turn failed. It does not check that the turn is still the newest one. So Try again in a tab that has not got the newer events sends an older message again.
- **Impact if no action:** A member can restart an old request after newer work, and the agent then answers out of order.
- **Root question:** Which failed turn may a member retry?
- **Options:**
  - **A.** Change nothing in the Worker. The chat shows Try again only on the newest turn, as PR #24 does. Effort: Small.
  - **D.** The session record names the one message that Try again may retry. The route refuses any other message with 409. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D.
- **Previous examples:** None found.
- **Recommendation:** D.
- **Action:** ask the user, because D adds a refusal.
