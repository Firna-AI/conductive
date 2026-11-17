# Another member's empty session can name the wrong login

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from Milestone 6 of the org agent login work on branch `calummoore/delft-zjk2`.
- **Location:** `src/chat/state/session-login.ts`, function `otherMember`, and the Rust `Session` type in `crates/cnd-runner-interface/src/tools/session_types.rs`.
- **Reason:** the fix changes the Worker and the Rust type, and the case is rare.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Org login:** an API key or own endpoint that an admin connects for the org on the Agents tab of the org settings.
  - **Default login:** the login that a member's new session takes in one org for one agent. Only the Worker decides it, and the account response names it for the reader only.
- **Background:** A session takes its starter's default login at its first accepted message. Until then, its record has no `login`. The composer of another member names the starter's login, such as "Cal's login".
- **Problem:** Priya opens Cal's empty session while Cal's default login is the org login. Her composer says "Cal's login", but her message runs on Acme's login, which the Worker picks.
- **Impact if no action:** In this rare case the label names the wrong owner of the login. No message runs on a wrong login.
- **Root question:** How does the composer learn the starter's default login for an empty session?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** The Worker names the starter's current default login in the record of an empty session, in an optional field, and the composer names it. Effort: Medium.
- **Left out:** No label in that case, because the composer must name another member's login. A computation of the starter's default in the browser, because the user chose on 16 November 2026 that only the server names the default login.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Recommendation:** B. Only the server knows the starter's default login.
- **Action:** fix after merge, apply B, because the case is rare and the fix reaches the Worker and the Rust type.
