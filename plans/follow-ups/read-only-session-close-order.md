# Reopen ignores local session close order

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review finding 14 of `calummoore/keyboard-shortcuts-settings`.
- **Location:** `src/chat/components/tab-keys.ts:41`, `src/chat/state/archive-view.ts:47`, `archive-view.ts:107`, and `src/chat/components/ChatOverlays.tsx:27`.
- **Reason:** Both review fix rounds are complete, and this existing branch defect does not block the merge of main.

- **Terms:**
  - **Session:** A workspace chat with its own tab.
  - **Read-only workspace:** An archived workspace, or one in a suspended org. Its tabs change in the browser without a server write.
  - **Session history:** The list of sessions whose tabs can reopen.
  - **ChatController:** The object that handles session tab actions.
- **Background:** Close tab and its close control both use `controller.requestClose`. In a read-only workspace, it calls `closeLocally`. Reopen calls `showLocally`. These functions change local tabs and the browser copy of the view. They keep stored session times.
- **Problem:** Open two archived tabs, A and B, in that order. Close A and then B. Both keep the same archive time, so the history keeps A first. Reopen closed session selects that first row and opens A. A suspended org has the same defect because open sessions have no stored end time and tie at the current time. A reopened older session can also retain its older time after another local close.
- **Impact if no action:** Reopen closed session opens a different session from the one that closed last. The person must find the intended session in history.
- **Root question:** How should the session history and Reopen closed session agree on local close order in a read-only workspace?
- **Options:**
  - **A.** Offer the shortcut only in writable workspaces. This removes it from archived workspaces and suspended orgs. It changes where the command runs and needs a user decision. Effort: Small.
  - **B.** Keep a local close stack in ChatController and give its latest entry to the shortcut. The history menu keeps its order. This breaks the requirement that the key reopens the first history row and needs a user decision. Effort: Medium.
  - **C.** Keep local close order in shared read-only history state. Make the menu and shortcut use it before stored end times. Keep writable workspace ordering unchanged. Clear local order at reload or Restore. Add a close-and-reopen regression case for an archived workspace. Rows keep their stored times, so those times can appear out of order. Effort: Medium.
  - **D.** Record the time of each local close and return it first from `endedAt`. Remove that time at a local reopen and clear it at Restore. Order, row age, and the key use that value. This changes which time the rows show and needs a user decision. It also needs a clock in chat state. Effort: Medium.
- **Left out:** Timestamp tie-breaking cannot recover close order that the state never recorded. It also fails when an older closed session is reopened and closed again. A stack in the key hook misses closes from the tab control. Server writes break the read-only rule. Changing nothing breaks the close-order requirement.
- **Wider fix:** D. One end-time value serves all readers of history and its ages. Its row-time change needs a user decision, so it does not block C.
- **Previous examples:** No earlier close-order defect was found. `plans/follow-ups/read-only-tabs-have-two-owners.md` records a related ownership problem.
- **Related:** `plans/follow-ups/read-only-tabs-have-two-owners.md` shares the tab state. Keep local close state beside `archiveTabs` until that item moves both to one owner. `plans/follow-ups/read-only-session-history-time.md` records the existing row-time problem that D would also fix.
- **Recommendation:** C. It meets the key and history requirements without changing row-time semantics.
- **Action:** fix after merge, apply C. Keep D as an option for a later decision about row times.

`docs/protocol/keyboard-shortcuts.md` requires Reopen closed session to reopen the session that closed last and requires history to list that session first. `docs/protocol/agents-and-sessions.md` also requires the last closed session first. A workspace that accepts writes keeps its stored close order, including closes from other members. `docs/protocol/session-transcripts.md` permits local read-only tabs for the member alone. Update the Read-only chats section of `src/chat/loads-and-sends.md` with the local order when this is fixed.

`historySessions` starts from the stored session order and filters open tabs. `orderSessions` keeps the tab order. The stable sort in `ChatOverlays.tsx` preserves that order when times tie. Add the local order to that final sort. The current key test in `src/shell/workspace/WorkspaceKeys.test.tsx` covers a writable workspace only. `src/chat/state/archive-view.test.ts` checks membership without checking close order.
