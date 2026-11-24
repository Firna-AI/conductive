# Share the owner of the saved socket state

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), the wider fix of review finding 5.
- **Location:** `worker/machines/socket-state.ts`, `worker/own-computers/socket-state.ts`, `worker/own-computers/channel.ts:46`, `worker/own-computers/channel.ts:62`
- **Reason:** The shared owner changes the host connection in `worker/machines/`, which another milestone changes at the same time.

- **Terms:**
  - **Socket attachment:** the state that Cloudflare saves with a hibernatable WebSocket and gives back when the Durable Object wakes.
- **Background:** The machine object and the computer object each keep the welcome state and the last request ID of their connection in the socket attachment. The machine object has one owner of that state, `SocketState`, whose `welcomed()` and `allocateId()` save the attachment in the same call. The computer channel changes the state and saves it in two separate places. A native test of the computer object now wakes it with its socket open and checks the next request ID.
- **Problem:** Two copies of the same pattern can drift. A change that drops one save in the computer channel reintroduces the reuse of request IDs after a wake, which the host connection fixed before.
- **Impact if no action:** Each later change to one channel must repeat the save in the other. The native test catches a lost save in the computer channel only.
- **Root question:** How do both connections keep each change of their saved socket state saved, in one place?
- **Options:**
  - **A.** Give the computer socket state its own owner with `welcomed()` and `allocateId()`, as `SocketState` does. Effort: Small.
  - **B.** Use one owner of the saved socket state for the host and the computer connections. Effort: Medium.
- **Left out:** A counter in object storage: request IDs need to be unique only within one connection, and the attachment ends with its socket.
- **Wider fix:** B.
- **Previous examples:** The host connection reused request IDs after a wake, and its fix put the allocator in the socket attachment (commit `86d421325`).
- **Recommendation:** B. One owner removes the second copy.
- **Action:** fix after merge, apply B, because it changes the host connection in `worker/machines/`.
