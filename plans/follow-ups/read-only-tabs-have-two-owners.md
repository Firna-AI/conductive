# Read-only tabs have two owners of their order

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from round 1 finding 3 of the review of branch `calummoore/tab-drag-and-drop`. Extended on 2026-11-21 with the suspension lift symptom from a finding check of branch `calummoore/follow-up-history-pages-change-the-saved-cj6o`.
- **Location:** `src/chat/state/archive-view.ts`, `showLocally` and `closeLocally`. `src/chat/state/sessions.ts:138`, the place that `placeSession` gives an arriving session. `src/chat/WorkspaceChat.tsx`, the `rowOf` call that draws the tab row. `afterRestore` at `src/chat/state/archive-view.ts:149`, which `withRecord` at `src/chat/state/workspace-records.ts:59` calls only when the workspace leaves the archived state.
- **Reason:** The branch that found it fixed the wrong order directly. This wider fix changes who owns the tab state of a read-only workspace, which reaches beyond that feature.

- **Terms:**
  - **Read-only workspace:** an archived workspace, or one whose org is suspended. Its tabs change in the browser only, and it sends no write.
  - **`archiveTabs`:** the list of the session tabs that a read-only workspace shows, kept in the chat snapshot in the browser.
  - **Saved view:** the open tabs in one order, the active tab, the list, and the tool of one user in one workspace. In a read-only workspace, the chat changes its browser copy only.
- **Background:**
  - The tab row draws the tabs in the order of the saved view, through `rowTabs` in `src/chat/state/tab-order.ts`. A tab opens at the end of the row, as "The tab row" in `docs/protocol/agents-and-sessions.md` says.
  - In a read-only workspace, Close and Reopen of a session change `archiveTabs` in the browser. Close shows the next session of `archiveTabs`.
  - So two lists hold the order of the read-only tabs: the browser copy of the view, which the row draws, and `archiveTabs`, which Close uses. The direct fix keeps them in step at each local Close and Reopen.
  - `placeSession` gives an arriving open session a place in the view. While `archiveTabs` is not null, the shared step of the next bullet changes only the open and the closed sessions. So in a suspended org, an update from the stream does not put back a place that the reader closed.
  - A live record of the stream and the end of a replay both place a session through one shared step. That step always puts a session in the open or the closed sessions of the snapshot. It changes the tabs, their order, the shown tab, and the view only while `archiveTabs` is null. While `archiveTabs` is not null, each page of a replay also updates the open and the closed sessions. Option B makes `placeSession` skip its place step while read-only. That skip must keep this update, so that live and replayed records still reach the open and the closed sessions. When B removes `archiveTabs`, the test `archiveTabs !== null` of that step must read the read-only state. The fix of [`plans/follow-ups/replay-completion-skips-final-placement.md`](https://github.com/Firna-AI/conductive/blob/878727a4294ee61406210cdf2ca1e8a2ce25eacc/plans/follow-ups/replay-completion-skips-final-placement.md) added this step. It does not remove the two owners of the tab order.
  - The follow-up item `plans/follow-ups/read-only-session-click-over-file.md` records a second symptom of the same split: a session click in a suspended org does not change the active tab of the view.
  - A lift ends the suspension of an org, but the chat keeps its local tab IDs. `withRecord` at `src/chat/state/workspace-records.ts:59` calls `afterRestore` only when the workspace leaves the archived state, and a lift changes no workspace state. So `archiveTabs` outlives the read-only mode. A finding check on branch `calummoore/follow-up-history-pages-change-the-saved-cj6o` saw it on 2026-11-21:
    1. Start with the open sessions `autocomplete` and `debounce`, and the closed session `postcode`, at event 30.
    2. The shell marks the chat read-only, as for a suspended org. A choice of `debounce` makes local tabs.
    3. The suspension ends, so the chat takes writes again.
    4. Reopen `postcode`. The reply gives its open record at event 41.
    5. Result: `postcode` is in the open sessions of the snapshot, but it has no tab, because the tab row still reads `archiveTabs`.
    - `origin/main` has the same code on this path, but nobody ran this case there.
    - It is a symptom of the same two owners. When option B removes `archiveTabs`, the local mode must come from the read-only state, so a lift also ends it.
- **Problem:** Each new read-only action must keep two lists in step by hand. A missed step makes the row and Close disagree.
- **Impact if no action:** A later change can again show a reopened tab at its old place, or make Close show a session that is not next to the closed tab. After a lift of an org suspension, a session that reopens can have no tab until a reload.
- **Root question:** How does a read-only workspace keep one order and one selection for its tabs?
- **Options:**
  - **A.** Keep the direct fix: each local Close and Reopen updates both lists. Effort: Small.
  - **B.** Make the browser copy of the view the one owner of the read-only tab order and selection. `archiveTabs` goes, the row and Close both read the view, a local Reopen moves the place to the end, and `showLocally` sets the active tab. `placeSession` skips its place step while the workspace is read-only, and the tabs stay when the view did not load. Effort: Medium.
  - **C.** Make each session Close take its neighbour from the order of the row, in every mode, through one helper on `rowTabs`. A local Reopen moves its place to the end. It also changes the Close of a workspace that takes writes. Effort: Medium.
- **Left out:** Save the read-only tabs to the server, because a read-only workspace sends no write. Keep the old place on a reopen, because a reopened tab opens at the end.
- **Wider fix:** B, because one owner removes the class.
- **Previous examples:** `plans/follow-ups/read-only-session-click-over-file.md`.
- **Related:** `plans/follow-ups/read-only-session-click-over-file.md`, a shared wider fix: B also fixes that item.
- **Recommendation:** B. One store of the read-only tabs makes both rules follow, also for a later read-only action.
- **Action:** fix after merge, apply B, because it changes who owns the read-only tab state, beyond the feature that found it.
