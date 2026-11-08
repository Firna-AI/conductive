# A failed first start removes the workspace and its queue

- **Severity:** Medium. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, option D of decision 130, from the 8i review of PR #42. The user chose A now and D as a later follow-up.
- **Location:** `worker/lifecycle/start-failure.ts` and `worker/lifecycle/failed-creation-events.ts` after Milestone 8i, and "Create a workspace" in `docs/protocol/workspaces-and-sandboxes.md`.

- **Terms:**
  - **First start:** the first start of the cloud computer of a new workspace. The first message of a new workspace triggers it.
  - **Queue:** the messages that wait in a workspace's chat until its cloud computer is ready.
- **Background:** Decision 91 D removes a new workspace whose first start fails, and it returns the first message to the composer of the tab that sent it. Try again creates a new workspace with a new ID. Decision 130 A holds every later message in its sender's composer until the first start succeeds, so a failed first start loses no accepted message.
- **Problem:** Under A, members cannot queue follow-up messages during a first start, and a held message lives only in its tab. A failed workspace leaves no record for the other members.
- **Impact if no action:** Members wait about a minute before they send a second message to a new workspace. A closed or reloaded tab loses its held text. The saved cause of a failed first start can also get lost: finding 15 of PR #50 (Milestone 5d) found that a user who leaves during a first start and comes back after its time limit sees only "Its sandbox didn't start.", and that a create that fails while its tab shows another page leaves no way back to the returned form. A tab that reads the workspace between the failure event and the removal can also miss the returned form.
- **Root question:** How do members keep sending during a first start, so that a failed start loses nothing?
- **Options:**
  - **D.** Keep the workspace when its first start fails. Its error, its chat, and its queue stay for every member. Try again starts the cloud computer again in the same workspace, with a new workspace token, and the queued messages then run in their order. The failed cloud computer is still cleaned up. Remove the parts that D replaces: the removal of the failed workspace, the return of the first message to the composer, the retry with a new workspace ID, the event replay for the first sender only, and the hold of later messages of decision 130 A. Effort: Large.
- **Left out:** A list of undelivered messages for each sender outside the removed workspace (option E of decision 130), because D keeps the messages where every member already reads them.
- **Wider fix:** D.
- **Previous examples:** option E of decision 91, option D of decision 130, and finding 15 of PR #50, whose check names this item as the fix of its class.
- **Recommendation:** D. It keeps the queue of decision 14 A for the first start too.
- **Action:** fix after merge, apply D, because the user chose A now and D as a later follow-up on 8 November 2026 (decision 130).
