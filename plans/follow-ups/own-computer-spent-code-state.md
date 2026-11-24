# The own computer state after a used code

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), review finding 3.
- **Location:** `docs/protocol/own-computers.md:92`, `src/shared/own-computers.ts:23`, `worker/own-computers/views.ts:43`, `src/marketing/docs/own-computers.md:33`
- **Reason:** The screens of the Own computers tab come later, and the state needs a requirement, a mockup, and guide text first.

- **Terms:**
  - **One-time code:** the code in the install command of an own computer. It works once, within 1 hour.
  - **Code exchange:** `POST /v1/computer`, where the computer gives its code and gets its computer token, before it opens its computer connection.
- **Background:** The protocol gives two states before the first connection: Waiting to connect (the code works) and Code expired (the code expired). After a code exchange and before the first welcomed connection, the code no longer works and has not expired. The browser API reports `waiting` with `codeAvailable: false` until the code's deadline, then `expired`. Show command answers `409 code_unavailable` in that state. New code works in that state and revokes the unused token. In a normal install the state lasts about one second. It stays when the computer lost the reply or did not save its token.
- **Problem:** No requirement, mockup, or guide sentence says what an admin sees and can do in that state. The row says Waiting to connect with Show command, which the route refuses.
- **Impact if no action:** An admin whose install lost its token sees Show command, which fails, and must wait for the hour to end before the row offers New code.
- **Root question:** What does an admin see, and what can the admin do, when a computer used its one-time code but has not connected yet?
- **Options:**
  - **A.** Keep Waiting to connect, and offer New code in place of Show command while the code is used. State it in the protocol, the mockup, and the guide. Effort: Small.
  - **B.** Add a separate state for a used code before the first connection, with New code. Keep it also after the deadline while the token can still connect. Effort: Medium.
  - **C.** Show Code expired with New code for each code that no longer works. Effort: Medium.
  - **D.** A, and the token from a used code can open the first connection only until the code's deadline, so Code expired is true after it. This adds a refusal of a late first connection. Effort: Medium.
- **Left out:** A code that works again until the first connection: a second use could take over the enrollment. Remove and Add as the only recovery: A gives the same in one action.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps Waiting to connect true to its definition and gives the admin New code with the reason.
- **Action:** ask the user, because the state has no approved requirement, mockup, or guide text.
