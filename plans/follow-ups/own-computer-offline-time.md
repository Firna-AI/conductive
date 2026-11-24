# Offline own computers can show a stale time

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), review finding 4.
- **Location:** `worker/own-computers/views.ts:53`, `worker/own-computers/own-computer.ts:194`, `worker/own-computers/connection-data.ts:76`
- **Reason:** The error needs a read near a disconnect, and the 2-minute grace of an offline own computer, which comes with the own provider, needs the same stored observation.

- **Terms:**
  - **Computer object:** the Durable Object `OwnComputer` of one own computer. It holds the computer connection.
- **Background:** The Own computers tab shows when an offline computer was last seen (`docs/protocol/own-computers.md`). The list reads `last_seen_at` from D1, then asks the computer object whether the socket is connected. The object writes the close time to D1 in the background (`ctx.waitUntil`) when the socket closes, and drops a failed write with no warning.
- **Problem:** When the socket closes during a list read, the reply can pair the new offline state with the earlier time, such as the time of the last hello. A failed close write keeps that earlier time until the next hello.
- **Impact if no action:** An admin can see the time when the computer connected in place of the time when it went offline. A later read corrects it when the close write succeeded.
- **Root question:** How does a member get the time that belongs to the reported offline state?
- **Options:**
  - **A.** Await the close write inside the object gate, and read the time in the same gate in `connection()`. Warn when the write fails. Effort: Small.
  - **B.** Make the computer object own one stored observation of the connection state and its time, and read both from it. Test a read that overlaps a disconnect, and a wake. Effort: Medium.
  - **C.** B, with the time of the last automatic ping reply (`ctx.getWebSocketAutoResponseTimestamp`) for a close that is not clean, and an alarm that stores it while connected. Effort: Large.
- **Left out:** An offline reply with no time: the protocol asks for the last seen time.
- **Wider fix:** B.
- **Previous examples:** The host command registry fixed a status read that combined two sources while a command completed (commit `86d421325`).
- **Recommendation:** B. One stored observation keeps the state and its time consistent across a wake, and the 2-minute grace can start from it.
- **Action:** fix after merge, apply B, because the likelihood is Rare and the grace of an offline computer builds on the same observation.
