# The relay error still says to rebuild

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-14, from branch `calummoore/porto-vtqz`, PR #342, review item 311.
- **Location:** `worker/previews/relay.ts:16`, `src/marketing/docs/terminal-and-previews.md`.
- **Reason:** The change of a user-visible message waits for the user's answer.

- **Terms:**
  - **Preview relay:** the program in each sandbox that forwards a port preview to a local port.
- **Background:** When a sandbox has no preview relay, the app shows the error `preview_relay_unavailable`. It tells the member to start a new workspace after an admin runs Build computer. Since the sandbox software updates itself, an update at a later start brings the relay, and the public guide says so.
- **Problem:** The app's message and the guide disagree.
- **Impact if no action:** A member does an unnecessary rebuild and creates a new workspace.
- **Root question:** What should a member do when previews are not yet available in an older workspace?
- **Options:**
  - **A.** Keep the message. Effort: Small.
  - **B.** Say that the cloud computer gets preview support with an automatic update at a later start. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** B. It matches the guide and the update rule.
- **Action:** ask the user, because the change is user-visible text.
