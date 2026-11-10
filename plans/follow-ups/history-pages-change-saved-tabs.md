# History pages can still change the saved tabs

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from PR #58, branch `conductor/boat-native-remote-workspaces-milestone-8q`, round 2, finding 3, with the rules of its check.
- **Location:** `src/chat/state/history.ts:31` and `src/chat/state/session-records.ts:179`.
- **Reason:** the problem needs unusual concurrent timing, and the fix costs the same after the merge.

- **Terms:**
  - **Record owner:** the one operation under `src/chat/state/` that writes and publishes the session records of a chat.
  - **History cutoff:** the event number up to which a history load reads the past events of a session.
- **Background:** The app reads the session list and the saved view before it loads history. Each history page publishes session records through the record owner.
- **Problem:** Start with the saved tabs `[autocomplete, debounce]`, with `autocomplete` selected, and a session list at event 30. History closes `autocomplete` at event 31, and the next page reopens it at event 33, with the cutoff at 40. After the final list at 40, the selection becomes `debounce`, the order reverses, and the saved view leaves out `autocomplete`.
- **Impact if no action:** A passing state of the history changes the conversation that the user sees, and the final list read does not restore it.
- **Root question:** How does a complete history read keep the saved selection when the final session state is open?
- **Options:**
  - **A.** Hold the tab placement until the history load succeeds or fails, and keep the page content incremental. It fixes only the history caller. Effort: Small.
  - **B.** Give the history replay and the stream replay one record-owner operation that controls the tab placement across pages, and publish the final placement when the replay ends. Effort: Medium.
    - When a page fails in the first load, the later list read sets the navigation.
    - When the connection drops during a stream replay, keep the held navigation until the next replay ends.
    - Hold only the navigation, not the other fields of a newer record. The composer shows while a later selection loads its history, and Send sends the shown model, at `message-actions.ts:109`.
  - **C.** Put the current session record at the history cutoff in the first history response, and seed the record owner before older events. It changes the Worker, the browser, and the contract. Effort: Medium.
  - **D.** A replay without a boundary, so that no passing state can change the navigation. It needs a user decision. Effort: Large.
- **Left out:** None.
- **Wider fix:** D. It also holds when a page fails, a replay drops, or a new paged input comes.
- **Previous examples:** finding 2 of PR #58, which the record owner fixed for the current list.
- **Recommendation:** B. It is the only browser-only option that also fixes the paged stream replay. D best protects the codebase.
- **Action:** fix after merge, apply B, because it needs unusual concurrent timing, and the fix costs the same later.
