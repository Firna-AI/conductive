# Offline own computers can show a stale time

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), review findings 4 and 8.
- **Location:** `worker/own-computers/views.ts:53`, `worker/own-computers/own-computer.ts:161`, `worker/own-computers/own-computer.ts:194`, `worker/own-computers/connection-data.ts:76`
- **Reason:** The error needs a read near a disconnect, and the 2-minute grace of an offline own computer, which comes with the own provider, needs the same stored observation.

- **Terms:**
  - **Computer object:** the Durable Object `OwnComputer` of one own computer. It holds the computer connection.
- **Background:** The Own computers tab shows when an offline computer was last seen (`docs/protocol/own-computers.md`). The list reads `last_seen_at` from D1, then asks the computer object whether the socket is connected. The object writes the close time to D1 in the background (`ctx.waitUntil`) when the socket closes, and drops a failed write with no warning.
- **Problem:** When the socket closes during a list read, the reply can pair the new offline state with the earlier time, such as the time of the last hello. A failed close write keeps that earlier time until the next hello, and nothing retries it. `webSocketClose` acts only on the channel that the object restored, so a close that comes first after a wake that did not restore its socket records no time. The platform can leave a disconnected socket out of the restore listing (`worker/test-support/README.md`), and the workspace object reads the socket attachment in that case (`worker/native-sockets.ts`). The connection test accepts any number as the time.
- **Impact if no action:** An admin can see the time when the computer connected in place of the time when it went offline. A later read corrects it when the close write succeeded.
- **Root question:** How does an offline computer always show the time when it was last seen, on every path that ends its connection?
- **Options:**
  - **A.** Await the close write inside the object gate, and read the time in the same gate in `connection()`. Warn when the write fails. Effort: Small.
  - **B.** Make the computer object own one stored observation of the connection state and its time, and read both from it. Test a read that overlaps a disconnect, and a wake. Effort: Medium.
  - **C.** B, with the time of the last automatic ping reply (`ctx.getWebSocketAutoResponseTimestamp`) for a close that is not clean, and an alarm that stores it while connected. A lost or failed close then leaves a time at most one interval old. Effort: Large.
  - **D.** In `webSocketClose` and `webSocketError`, read the attachment of a socket that is not the current channel, and record the disconnect of a welcomed socket of this object, as `WorkspaceSockets.close` does. Effort: Medium.
- **Left out:** An offline reply with no time: the protocol asks for the last seen time.
- **Wider fix:** C. It limits the stale time on every path, also on a path that a later change or the platform adds.
- **Previous examples:** The host command registry fixed a status read that combined two sources while a command completed (commit `86d421325`).
- **Recommendation:** B, with D in the same change. One stored observation keeps the state and its time consistent across a wake, D brings each close that the platform delivers to it, and the 2-minute grace can start from it. The test rejects the D1 write, wakes the object, and checks the exact time.
- **Action:** fix after merge, apply B, because the likelihood is Rare and the grace of an offline computer builds on the same observation.
