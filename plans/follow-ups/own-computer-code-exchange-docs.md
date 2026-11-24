# The docs reverse the order of the code exchange

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), review finding 7.
- **Location:** `docs/protocol/own-computers.md:160`, `docs/protocol/own-computers.md:173`, `docs/architecture/flows.md:36`, `worker/own-computers/route.ts:19`
- **Reason:** The protocol states one order, and an agent call of the own computers plan built another, so the user decides which side is right.

- **Terms:**
  - **One-time code:** the code in the install command of an own computer. It works once, within 1 hour.
  - **Computer token:** the credential with which an own computer opens its computer connection. The Worker keeps only its digest.
- **Background:** The Worker takes the one-time code on `POST /v1/computer` and gives back the computer token in the reply. The code stops working in the same step. The computer saves the token, then opens the computer connection, a WebSocket on `GET /v1/computer`, with the token. The first welcomed connection records the first connection, sets the default limit from the reported size, and asks the first build. An agent call of 24 November 2026 chose this order, so that the computer holds its token before its first connection, and New code covers a lost reply.
- **Problem:** `docs/protocol/own-computers.md` says that the computer gives its code at its first connection, and then that the connection requires the token. `docs/architecture/flows.md` puts the computer connection before the token. Neither says that the code exchange comes first.
- **Impact if no action:** A computer program that follows the docs sends the code on the first upgrade, and the Worker refuses it with `401`.
- **Root question:** In what order does a new own computer use its one-time code, get its computer token, and count as connected?
- **Options:**
  - **A.** Keep the code exchange before the first connection. Update both docs to say that the computer gives its code on `/v1/computer`, saves the token from the reply, then opens its first connection with it. Read both legal pages and each public guide in full, as `CLAUDE.md` says. Effort: Small.
  - **B.** Take the code on the first WebSocket upgrade, and give the token over that connection after the computer reports its size. Define the recovery when the token message is lost. Effort: Medium.
  - **C.** The computer makes its own credential before it gives the code, and the exchange registers its digest. A lost reply then still lets the computer connect. Effort: Large.
  - **D.** Make the code exchange the first connection: the computer sends its size with its code, and the exchange records the first connection, the default limit, and the first build request. After a lost reply, the computer shows Offline with no token, and the recovery is Remove computer, then Add computer. Effort: Medium.
- **Left out:** The computer token in the install command: a stolen command then gives a lasting credential. A code that also works on the first upgrade: the docs would give two orders.
- **Wider fix:** None. The `documentation` skill already requires the docs and the boundary to agree.
- **Previous examples:** Commit `ad2adc641` corrected file request docs that described a boundary differently from the code.
- **Related:** `plans/follow-ups/own-computer-spent-code-state.md` has the same cause. Under A or C, its state stays, and both changes edit the Add computer section. Under B or D, its state goes away. Answer both together.
- **Recommendation:** A. It keeps one lasting credential on the computer connection and the tested recovery through New code, and it changes two doc passages.
- **Action:** ask the user, because the protocol states one order and only an agent call chose the other.
