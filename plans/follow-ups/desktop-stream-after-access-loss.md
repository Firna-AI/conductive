# A removed member can keep watching the desktop

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, option C of `shared-session-check-for-connections`, which Milestone 11b applies with option B and deletes. The user sees it as item 117.
- **Location:** `worker/desktop/README.md:14`, and the sections "Orgs and workspaces" and "Desktop" of `docs/protocol/access-and-security.md`.
- **Reason:** each option changes a protocol rule or adds a route of the sandbox provider.

- **Terms:**
  - **Desktop stream:** the live desktop of the sandbox, which the browser loads straight from Boat with a URL that works for 10 minutes.
- **Background:** Decision 70 says that an open tab loses its workspace connection within 30 seconds after its user loses access. Milestone 11b gives the chat tabs and the terminal sockets one shared check. The desktop stream does not pass through the Worker, so no check can end it.
- **Problem:** An open desktop stream keeps playing after a sign-out, a removal from the org, or a deleted org, until the sandbox stops.
- **Impact if no action:** A removed member can keep watching the agent's desktop, which breaks the rule of decision 70.
- **Root question:** How does an open desktop stream end when its user loses access?
- **Options:**
  - **A.** Accept it, and state in the access protocol that an open desktop stream can play until the sandbox stops. Effort: Small.
  - **B.** Ask Boat to end the desktop session of the sandbox when a member loses access, if Boat has such a route. It adds a route to the fixed list, and nobody has checked that Boat offers it. Effort: Medium.
  - **C.** Send the desktop stream through the Worker, so that the shared access check ends it as it ends a terminal socket. Effort: Large.
- **Left out:** A shorter desktop URL, because an open stream keeps playing after its URL expires.
- **Wider fix:** C.
- **Previous examples:** finding 1 of PR #6, and finding 4 of PR #9.
- **Recommendation:** A now. A removal is rare, and the stream ends when the sandbox stops. C protects best, at the cost of a large build.
- **Action:** fix after merge, apply C, because the user chose A now and C as a later follow-up on 7 November 2026 (decision 117). The access protocol states the exception until C lands.
