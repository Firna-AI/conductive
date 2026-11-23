# Joined notices check only the receiving sender

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the review of `calummoore/agent-scheduling-wake-future-nlp0`.
- **Location:** `worker/chat/session-watch-admission.ts:20` and `worker/chat/secret-notice.ts:40`.
- **Reason:** Checking both members would tighten the existing access rules on `main` and needs Cal's decision.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **Watch wake:** A notice to the calling session when the turn that its agent watches ends.
  - **Late secret answer:** A notice to a session when a member answers its secret request after the agent stops waiting.
  - **Receiving turn:** The running turn that takes a notice in that session.
- **Background:** A watch wake or late secret answer can start a new turn or join a running one. A new turn uses the sender who set the watch or whose turn requested the secret. A receiving turn keeps its own sender. Scheduled wake-ups check both members' current org membership and session login access when they join a turn.
- **Problem:** When a watch wake or a late secret answer joins another member's running turn, admission checks only that turn's sender. The member who set the watch or whose turn requested the secret can have lost org membership or session login access.
- **Impact if no action:** A joined notice can trigger agent work after the member who initiated it loses access. The receiving turn still uses the rights of its own sender.
- **Root question:** Whose access must still be valid when a watch wake or late secret answer joins a turn?
- **Options:**
  - **A.** Keep the current receiving-sender check. State whose access applies in `docs/protocol/session-watches.md` and `docs/protocol/secret-late-answers.md`. Effort: Small.
  - **B.** Use one two-role access check for scheduled wake-ups, watch wakes, and late secret answers. Check the originating and receiving senders at admission and when a pending watch wake resumes. Reuse one result when both senders are the same. Keep each flow's existing response to an access failure. Effort: Medium.
- **Left out:** Checking only org membership would let a notice through after its originating sender loses access to the session login.
- **Wider fix:** B applies the same rule to all three sources of joined notices.
- **Previous examples:** Scheduled wake-ups use the two-role check in `worker/chat/wake-admission.ts`.
- **Recommendation:** B. Each member whose authority lets the notice run must still have access.
- **Action:** Ask Cal whether to require the originating sender's access for these two existing paths.
