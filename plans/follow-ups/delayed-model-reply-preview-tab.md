# A delayed model reply leaves the Preview tab

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/seoul-m0i6`, review finding 6.
- **Location:** `src/chat/state/model-moves.ts:94`
- **Reason:** the defect needs an unusual reply timing, and the fix rule defers a rare product bug that is not High.

- **Terms:**
  - **Model change:** a request to change the agent or the model of a session. It can make another session, and its reply can move the draft there.
  - **Preview tab:** a desktop tab of the centre row that shows the page of one port of the cloud computer.
- **Background:** `applyMoves` runs when the reply of a model change arrives. It moves the draft to its new session and shows that session, unless the user chose another tab while the reply waited. It keeps a shown file or diff tab, because `showsFile` checks the kinds `file` and `diff`. The workspace view now also holds the kind `preview`.
- **Problem:** When the user shows a Preview tab while a model change waits, the reply replaces the shown Preview tab with the new session.
- **Impact if no action:** A delayed reply takes the user away from the page that they chose to look at.
- **Root question:** How does a delayed model change respect a newer choice of a tab that is not a session?
- **Options:**
  - **A.** Add `preview` to the kinds that `showsFile` checks, and add a Preview case to the test of the delayed reply. Effort: Small.
  - **B.** Keep every tab that is not a session: check `activeTab.kind !== 'session'` for a view that has an active tab, and keep the behaviour of a view with none. Add the Preview case to the test. Effort: Small.
  - **C.** Count the choices of tabs, and show the new session only while the choice of the request stays the newest one. Effort: Medium.
- **Left out:** A move that always shows the new session repeats the defect that commit `d1ec85ee7` fixed for files.
- **Wider fix:** B. A later kind of tab then keeps its choice with no change of this code.
- **Previous examples:** Commit `d1ec85ee7` fixed the same delayed reply for the session, file, and diff tabs.
- **Recommendation:** B. It covers each later kind of tab.
- **Action:** fix after merge, apply B, because the defect needs an unusual reply timing.
