# The chat keeper checks the shown session by hand

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Wider fix.
- **Added:** 2026-11-13, from review finding 8 on branch `calummoore/seoul-aki1`.
- **Location:** `src/chat/components/reading-place.ts`, `useReadingPlace`, and `src/chat/components/ChatPane.tsx`.
- **Reason:** The fix changes how the chat box mounts at each switch of session tabs. It needs its own browser check of the scroll and of the focus of the composer.

- **Terms:**
  - **Keeper:** `useReadingPlace` and its `ReadingPlace`, which keep the row that the reader reads in place and write the place of the shown session.
  - **Sent IDs:** the IDs of the messages that this chat sent and that wait for a reply. A new ID takes the chat to the bottom.
- **Background:**
  - All sessions of a workspace share one chat box, so the box stays mounted when the user changes session tabs.
  - So the keeper compares the place memory with the one of its last run, through the `seenMemory` ref and the `sameSession` check. A switch then does not count the waiting messages of the new session as new sends.
  - `TabPlace.dom.test.tsx` tests a send after a switch, so a wrong check fails a test.
- **Problem:** The keeper tracks the shown session by hand, beside the place memory that already names it.
- **Impact if no action:** A later change of the keeper can break the check again. The test catches it, but the check stays easy to get wrong.
- **Root question:** How does the keeper start fresh for each session without a check by hand?
- **Options:**
  - **A.** Keep the check and its test. Effort: Small.
  - **B.** Move the scroll box of `ChatPane` and `useReadingPlace` into an inner part that has the session ID as its key. Each session then gets a new keeper and a new set of seen IDs. Delete `seenMemory`, `sameSession`, and the `memory` dependency. Cost: the transcript box mounts again at each switch. Effort: Medium.
  - **C.** Keep the sent IDs that each session handled in its place record in `ChatStore`, and delete the refs of the hook. Cost: the store holds bookkeeping of the view. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. It removes the check by hand.
- **Previous examples:** None found.
- **Recommendation:** B. A key is the React way to give each session its own state.
- **Action:** fix after merge, apply B, because it changes the mount of the chat box and needs a browser check.
