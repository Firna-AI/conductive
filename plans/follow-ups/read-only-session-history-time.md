# Read-only history rows keep showing now

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the second pass of review finding 14 on `calummoore/keyboard-shortcuts-settings`.
- **Location:** `src/chat/state/archive-view.ts:61` and `src/chat/components/ChatOverlays.tsx:25`.
- **Reason:** This behavior is already on main and lies outside the keyboard shortcut changes.

- **Terms:**
  - **Read-only workspace:** A workspace whose tabs change locally without a server write, such as one in a suspended org.
  - **Session history:** The menu of chats whose tabs the person can reopen.
  - **End time:** The close or archive time that `endedAt` gives a history row.
- **Background:** A suspended org keeps stored open sessions. The person can hide their tabs locally. `endedAt` gives those sessions no end time. The history view replaces a missing end time with the current time on each render.
- **Problem:** After a local tab close, its history row shows now for the rest of the visit. The displayed age does not grow.
- **Impact if no action:** The row gives an inaccurate age for a session hidden locally.
- **Root question:** Which time should a history row describe after a local close in a read-only workspace?
- **Options:**
  - **A.** Show no age when the session has no stored end time. Keep stored end times for the other rows. This adds an unavailable-time state and needs a user decision. Effort: Small.
  - **B.** Store each local close time in read-only state. Have `endedAt` return it first. Clear it at reopen, reload, or Restore. Menu order, the reopen key, and row age use one value. This changes row-time semantics and needs a user decision before implementation. Effort: Medium.
  - **C.** Mark locally hidden open sessions as open and show no closing age. This separates local tab state from stored session state. It adds visible wording and needs a user decision. Effort: Medium.
- **Left out:** Changing nothing keeps an age that never grows. Anchoring the time at the first menu render measures when the menu opened, not when the tab closed.
- **Wider fix:** B. One recorded local close time serves every reader of the history order and ages.
- **Previous examples:** `plans/follow-ups/read-only-session-close-order.md` records another consequence of missing local close metadata.
- **Related:** `plans/follow-ups/read-only-session-close-order.md` shares B as its wider option D. `plans/follow-ups/read-only-tabs-have-two-owners.md` owns the wider state move. Keep new read-only close state beside the current `archiveTabs` owner until that move.
- **Recommendation:** B. It gives the menu, key, and age one source for local closes.
- **Action:** Ask the user when this separate work starts, because the choice changes which time read-only history rows describe.

Before a later implementation changes the requirement, update `docs/protocol/agents-and-sessions.md` with the chosen meaning. Read the legal pages and public guides for any sentence that restates it. This decision does not block merging main into the keyboard shortcuts branch.
