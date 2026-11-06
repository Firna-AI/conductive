# Older chat records can replace newer state

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #13, branch `conductor/boat-native-remote-workspaces-milestone-8`, findings 2 and 5 and two new problems of their checks.
- **Location:** `src/chat/state/context.ts:141` and `:149`, and the session edit and reopen paths of the chat state.
- **Reason:** each case needs delayed events or overlapping failed requests, so the fix rule defers it.

- **Terms:**
  - **Stream record:** a workspace event that the chat gets over its event socket, such as `session.updated`.
  - **Reply:** the answer of an HTTP request of the chat, such as a rename or a reopen.
- **Background:** The chat applies a change at once, sends its request, and then takes the reply. Stream records of the same change can arrive before or after the reply. Earlier fixes of the same branch, in `f5018e0` and `ddfd5fd`, already stopped two cases where an older value replaced a record.
- **Problem:**
  - Two failed edits: the second request captures the first request's unconfirmed value, so its recovery restores a value that the server rejected.
  - A delayed close event after a quick reopen selects the neighbour session again.
  - A stream record that the server wrote before a pending rename or model change hides that change for a moment.
  - An older workspace event after a Resume reply shows the stopped state and Resume again until the newer event arrives.
- **Impact if no action:** In rare timing, the chat shows a rejected value, the wrong session, or a stale state for a moment.
- **Root question:** How does the chat know whether a stream record is older than a change that it already applied?
- **Options:**
  - **A.** Reload the record after each failed change. Effort: Small.
  - **B.** Keep confirmed records separate from pending changes. Remove failed changes, and derive the display again. Effort: Medium.
  - **C.** Give each reply and each stream record a server order number, and ignore a record that is older than a reply that the chat already applied. Effort: Medium.
  - **D.** Track only the selection and the tabs on the client. It covers the selection and the tabs only. Effort: Small.
- **Left out:** None.
- **Wider fix:** C. Only a server order tells the chat which state is newer, for every record type.
- **Previous examples:** findings 3 and 4 of the earlier round of PR #13, fixed in `f5018e0` and `ddfd5fd`.
- **Recommendation:** C, with B for the pending changes.
- **Action:** fix after merge, apply C, because each case needs rare timing.
