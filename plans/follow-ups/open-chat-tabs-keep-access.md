# Open chat tabs keep access after removal

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #6, branch `conductor/boat-native-remote-workspaces-milestone-7`, finding 1. Raised to the user as item 70.
- **Location:** `worker/chat/backend.ts:265` and `worker/chat/backend.ts:177`, where the workspace Durable Object pushes events to open tabs.
- **Reason:** each option sets how long a removed member can still read new chat events, and no requirement states that time.

- **Terms:**
  - **Tab:** one browser connection to the events socket of a workspace.
  - **Workspace Durable Object:** the Cloudflare object that stores one workspace's chat and pushes each new event to its open tabs.
- **Background:**
  - The Worker checks the session and the org membership when a tab opens its socket.
  - After that, the Durable Object pushes each new chat event to the tab, also each streamed text chunk.
  - The agent login side is fixed: before each login goes to the runner, the Durable Object checks the workspace token again.
  - The whole app uses one D1 database. Cloudflare says one D1 database runs about 1,000 queries a second when each query takes 1 ms.
- **Problem:** A member who is removed from the org, a tab whose user signed out, or a tab of a deleted org keeps getting new chat events on a socket that opened before the change.
- **Impact if no action:** A removed member can read new chat content until the tab closes.
- **Root question:** How soon must an open tab lose access after its user loses access?
- **Options:**
  - **A.** Limit the life of each socket, for example to 5 minutes. The tab then reconnects through the gate with its last event number, so it loses no event. Access ends within 5 minutes. Effort: Small.
  - **B.** Check the access of all open tabs again at most every 30 seconds, with one D1 read. A failed check closes the socket. Access ends within 30 seconds. Effort: Medium.
  - **C.** Check access before each pushed event. Access ends at once. Each streamed event, also each text chunk, adds a read of the one shared D1 database. Effort: Medium.
  - **D.** B, plus a close at once when an admin removes a member or deletes the org: those paths call the Durable Object. Other paths, such as sign-out, end within 30 seconds. Effort: Medium, plus a change in the members backend.
- **Left out:** a close by the browser itself, because a hostile client ignores it.
- **Wider fix:** D. Each new way to lose access gets the 30-second limit without socket code, and the common paths end at once.
- **Previous examples:** None found.
- **Related:** finding 1 of PR #6 fixed the agent login side.
- **Recommendation:** B. It ends access within 30 seconds with one read per 30 seconds, and it keeps D1 off each streamed event.
- **Action:** ask the user, because each option sets how long a removed member can still read new chat events, and the access protocol must then state that time.
