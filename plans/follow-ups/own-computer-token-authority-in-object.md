# Keep the computer token authority in its object

- **Severity:** Medium. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-10-own-computer-hena` (pull request #677), the wider fix of review finding 1.
- **Location:** `worker/own-computers/own-computer.ts`, `worker/own-computers/code-data.ts`, `worker/own-computers/data.ts`, `worker/members/purge-data.ts`
- **Reason:** The direct fix closes the socket for each revocation path of the branch, and the next revocation path, the org purge, comes with the own provider.

- **Terms:**
  - **Computer object:** the Durable Object `OwnComputer` of one own computer. It holds the computer connection.
  - **Computer token:** the credential with which an own computer opens its computer connection on `/v1/computer`. D1 keeps its digest in `own_computers.token_digest`.
- **Background:** D1 holds the digest of each computer token. The computer object reads it in one serialized step with each accept. Each path that revokes a token writes D1 first, then asks the object to close a socket whose digest no longer matches: the removal of a computer and New code. The host connection keeps its token digest in the machine object itself, so each revocation is one object call (`worker/machines/machine.ts`).
- **Problem:** Each new path that clears a digest in D1 must also remember the object call. The org purge after the 7 days of a deleted org deletes the rows by cascade (`worker/members/purge-data.ts`) and asks no object to close, so an open computer connection of a deleted org stays open until it drops.
- **Impact if no action:** A later write path can leave a revoked socket open. Such a socket gets no operation, because the object checks the digest before each operation, but it stays open.
- **Root question:** How does each revocation of a computer token end its connection, also for a path that a later change adds?
- **Options:**
  - **A.** Keep D1 as the authority, and add the object call to each new path, starting with the org purge. Effort: Small.
  - **B.** Keep the token digest in the computer object, as the machine object does, and keep D1 only as the index from a one-time code to its computer. Each revocation is then one object call that closes the socket in the same step. Effort: Large.
- **Left out:** A time limit for sockets that never send an accepted hello: it limits the harm but does not end the connection at the revocation.
- **Wider fix:** B.
- **Previous examples:** The machine object keeps the token digest, its owner, and a generation in its own storage (`worker/machines/machine.ts`).
- **Recommendation:** A for the org purge when the own provider adds it, then B when a third revocation path appears.
- **Action:** fix after merge, apply A, because the org purge revocation belongs to the work that runs workspaces on own computers.
