# Replay completion skips the final tab placement

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from round 1 findings 1 and 2 of the review of branch `calummoore/follow-up-history-pages-change-the-saved-cj6o`, and from their two finding checks, before the pull request of that branch opened. Source letters, as history: finding 1's A, B, C, D, and E are A, C, D, B, and E here. Finding 2's A is the read-only part of A, B, and D here. Its B is the first entry under **Left out**. Its C is the split helper of C and E here. Its D is E here, without its rule that a failed load places nothing. Its E is F here.
- **Location:** `src/chat/state/session-replay.ts:103`, where a replay tracks a session, and `src/chat/state/session-replay.ts:106-114`, `finish`. `src/chat/state/history.ts:91`, `replay.finish(complete)`. `src/chat/state/session-records.ts:89-107`, the `place` callback of `replaySessionRecords`, with its local test at line 102 and the local branch of `placeShown` at line 84. `src/chat/state/load.ts:94` and `src/chat/state/load.ts:100-107`, the first load and its later session list read. `src/chat/state/archive-view.ts:149`, `afterRestore`.
- **Reason:** Both cases need unusual timing or read-only tab changes around a replay, and the shared fix costs the same after the merge.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Replay:** one read of stored events in pages. A history load of one session is a replay. The stored history that the event stream sends at each connection, before its live events, is a replay too.
  - **Placement:** the open tabs, their order, and the shown tab. The record owner keeps, for each session, the record that places its tab: the published placement.
  - **Stored lists:** `sessions` and `history` of the chat snapshot, the open and the closed sessions. Restore and the session history read them.
  - **Local tabs:** the browser-only tabs of a read-only workspace, which is archived or belongs to a suspended org. `archiveTabs` holds them. While it is not null, the local tabs own the navigation.
  - **SessionLog:** the event log of one session, in `src/shared/transcript/session-log.ts`. It drops an event number that it already holds, and it keeps the newest record of the session.
- **Background:**
  - The record owner, `src/chat/state/session-records.ts`, writes and publishes the session records of a chat.
  - The task of 2026-11-21 for branch `calummoore/follow-up-history-pages-change-the-saved-cj6o` applies recorded option B of the item "Paged socket history can still change saved tabs". One record-owner operation holds the placement across the pages of a replay, and it publishes the final placement when the replay ends. After a failed page in the first load, the later session list read sets the tabs. The branch built that option and deleted the item.
  - "Record order" in `src/chat/loads-and-sends.md` gives the rules in force. A page shows its messages and the newer fields of its records when it merges. When no replay runs any more, the tabs follow the newest record of each session. A close, a reopen, a choice of a tab, and a model change apply at once.
  - The first load is `loadChat` in `src/chat/state/load.ts`. It reads the session list, the view, and the workspace, and it loads the newest history page of the shown session at line 94. Then it reads the workspace and the full session list again, at lines 100-107. No other path reads the full session list after a history page.
  - These history loads read no session list after their pages:
    - the watch of the shown session, at `src/chat/state/history.ts:172`
    - Try again, at `src/chat/state/controller.ts:85`
    - the session actions, at `src/chat/state/session-actions.ts:36` and `:45`
    - the next session after a close, at `src/chat/state/close-actions.ts:45`
    - a model change, at `src/chat/state/model-actions.ts:105`
    - a linked reply, at `src/chat/state/linked-replies.ts:91`
    - the read-only view, at `src/chat/state/archive-view.ts:106`
  - The stream replay: `WorkspaceStream` calls `replaying(true)` at each page of its stored history, and `replaying(false)` after a final page, at `src/chat/stream/workspace-stream.ts:155` and `:162-163`. `createChatContext` keeps one replay open across a dropped connection, at `src/chat/state/controller-context.ts:111-118`. `applyEnvelopes` merges the pages through it, at `src/chat/state/apply-events.ts:40`.
  - The current end of a replay, which the branch published:
    - Each replay tracks a session only when a merge changes the newest record of that session in SessionLog, at `src/chat/state/session-replay.ts:103`.
    - A history load ends with `replay.finish(complete)` at `src/chat/state/history.ts:91`. A failed load drops the sessions that it tracked. Their events and records stay in SessionLog.
    - The end of the last running replay places only the sessions that a successful replay tracked, at `src/chat/state/session-replay.ts:106-114`.
    - While local tabs exist, the `place` callback passes `next.archiveTabs !== null`, at `src/chat/state/session-records.ts:102`. `placeShown` then updates only the fields of the record through `withCurrentFields`, at line 84. The stored lists stay as they were.
  - A failed history load drops its held placement because of an agent's design call of 2026-11-21, in commit `78ef49991` of the branch. It is not the user's choice. The call expects a later session list read to set the tabs. But only the first load reads the full session list after a history page, and the later history paths above do not. The held change is also not partial: earlier pages hold only older records, so the newest record after the newest page is final for the cutoff of the load.
  - The selected option B holds only the navigation. With local tabs, `archiveTabs` is the navigation, so the stored lists need no hold. A fix can update them at each merged page at no extra cost.
  - Restore: a workspace record that leaves the archived state calls `afterRestore`, at `src/chat/state/workspace-records.ts:59`. `afterRestore` at `src/chat/state/archive-view.ts:149` clears the local tabs, so the stored open list gives the tabs and the shown session. `reloadView` then reads the saved view again, but it does not correct the stored lists. A reload of the page corrects them through `confirmSessions`.
  - A message to a closed session gets HTTP 409 `session_closed`, "Reopen the session to send a message.", from `worker/chat/send-message.ts:35`.
  - The requirements in force: `docs/protocol/tab-row.md` says that each member's tab order stays after a reload, and that the shown tab comes from the saved view. `docs/protocol/chat-and-events.md` says that the chat shows each event of a session once and in event order. `docs/protocol/agents-and-sessions.md` says that a link in a read-only workspace shows the stored chat of a session "as a tab in this browser only".
  - **The retry case**, in a chat that takes writes. A finding check reproduced it on 2026-11-21, with the replay test kit of the branch:
    1. Start with the open sessions `autocomplete` and `debounce`, a session list at event 30, and the saved tabs `[autocomplete, debounce]` with `autocomplete` shown.
    2. Select `debounce`. Its newest history page holds its close at event 39, with the cutoff 40 and more pages before event 39.
    3. The earlier page fails with HTTP 503, so the history load fails.
    4. Result: `debounce` stays an open and shown tab. Its record in the open list has a non-null `closedAt`.
    5. Try again gets the same newest page and a successful earlier page. The load returns the cutoff 40, and its history is ready. `debounce` still stays open and shown.
    6. A final page of a stream replay with the same close at event 39 also leaves the tab open.
    7. A stored history through event 38, and then a live copy of the close at event 39, also leave the tab open.
    - A control with a successful load of `debounce` closes its tab and shows `autocomplete`.
    - A later record of `debounce` at event 41, such as a rename, repairs the tabs. A new start whose current list at event 41 gives `debounce` as closed also repairs them. For the user, a reload is the practical repair.
    - The same cases on `origin/main` code, with the two test helpers of the branch, close the tab at the merge. So the branch caused this case.
  - **The read-only case.** A finding check reproduced it on 2026-11-21 with the real chat controller:
    1. Start with the open sessions `autocomplete` and `debounce` at event 30, with `autocomplete` shown.
    2. A page of a stream replay holds the close of `autocomplete` at event 31 and the Archive of the workspace at event 32. More pages follow.
    3. While the replay waits, close `debounce`. The workspace is archived, so the close changes only the local tabs.
    4. An empty final page with the cutoff 40 ends the replay.
    5. A Restore at event 41 moves the workspace to the stopped state.
    6. Result: the open list holds `autocomplete`, with a non-null `closedAt`, and `debounce`. The closed list is empty. Both tabs show, and the closed `autocomplete` is the shown session.
    - A dropped connection and a local choice of `debounce` during the reconnect wait give the same result. A control with no local action gives the right lists.
    - `origin/main` code with the same steps gives the open list `[debounce]`, the closed list `[autocomplete]`, and `debounce` shown. So the branch caused this case.
    - Variants with the same cause, on the branch:
      - A new session `created` first shows in the replay at event 31, with the Archive at event 32. A local choice of `debounce` comes before the empty final page. `created` is then in neither stored list. So the read-only session history does not list it, and it has no tab after a Restore. With no local action, both lists are right.
      - The session list gives `autocomplete` as closed. The replay reopens it at event 31, with the Archive at event 32. A local choice of `debounce` comes before the empty final page. After a Restore, `autocomplete` stays in the closed list and has no tab.
      - The shell marks the chat read-only before the replay, as for a suspended org, and a choice of `debounce` makes local tabs. A replay holds the close of `autocomplete` at event 31, also as one final page with the Archive at event 32. When the chat takes writes again, or after a Restore at event 41, `autocomplete` stays in the open list.
    - A message from the stale tab gets HTTP 409 `session_closed`. A reload repairs the lists through `confirmSessions`.
  - **The first-load case**, outside the code diff of the branch. A finding check reproduced it on 2026-11-21:
    1. Start with the open sessions `autocomplete` and `debounce`, the saved tabs `[autocomplete, debounce]`, and `autocomplete` shown. The first session list read answers at event 30.
    2. The newest history page of `autocomplete` holds its close at event 31, with the cutoff 35 and more pages before event 31. The earlier page is empty, so the load succeeds.
    3. The later session list read of the first load answers only after that load ended. It gives both sessions as open, at event 40.
    4. Result: the end of the history load publishes the close at event 31, so its tab closes and `debounce` shows. The later list read then opens `autocomplete` again at the end of the row, with `debounce` still shown.
    - The right result keeps `[autocomplete, debounce]` with `autocomplete` shown. `origin/main` code gives the same wrong result in the same test, so the branch did not cause this case. The first-load hold of B and E fixes it.
  - Prototypes of the failed-load end of B and of the comparison of E, each with the first-load hold, ran in a scratch copy on 2026-11-21. The branch does not keep them. Four cases failed on the branch: a failed selected load, Try again, a stream replay with the same close, and the first-load case. Both prototypes passed them, with 37 test files and 151 tests: all 35 files of `src/chat/state`, the stream tests, and the four new cases. No prototype covered the split helper.
- **Problem:** The end of the last replay applies the newest records only in part. In a chat that takes writes, it places only the sessions whose record changed in that replay, so a change that a failed load held never shows. With local tabs, it updates the fields but not the stored lists, so the session history and a later Restore show stale lists.
- **Impact if no action:** A closed session can stay an open and shown tab, and a message from it gets HTTP 409 `session_closed`. After a Restore, the tabs can show stale open and closed sessions until a reload.
- **Root question:** How can the end of a replay apply the newest record of every session, and keep the held first-load and local read-only navigation?
- **Options:**
  - **A.** Two direct fixes in the end of a replay. Track a session whose record event SessionLog drops as a repeat. While local tabs exist, put each placed session in the open or the closed list, and keep the local tabs, the shown session, and the view. Add the regressions of the retry, the stream copy, and the Archive, replay, and Restore steps. Cost: a failed load with no later replay of the same event keeps the stale tab, a live copy publishes nothing, and the first-load case stays. Effort: Small.
  - **B.** End a failed history load like a successful one, with the first-load hold, and add the stored-list update of A.
    - A failed load hands its held sessions to the end of the last running replay, so an overlapping stream replay still holds them. Change `replay.finish(complete)` at `src/chat/state/history.ts:91`.
    - Hold the first load until its later session list read, so that read still sets the tabs. Open the hold in `loadChat` before the newest page. End it after the second `confirmSessions`, and on the failure path of that read.
    - Update the "Record order" bullets of `src/chat/loads-and-sends.md` and the replay lines of `src/chat/tests.md`. Add regressions for a failed selected load, for Try again, and for a first load whose history ends before the list read.
    - Risk: a failed load now moves a tab, which the design call avoided. `origin/main` gives the same result at the merge. B keeps the tracking rule, so it is a direct fix, and a new paged input can bring the defect back. The prototype of its failed-load part passed. Effort: Small.
  - **C.** Give each replay its own final placement candidates, apart from the repeat check of SessionLog, and publish them only after a success. Add a shared helper that splits the stored lists from the visible placement, for the end of a replay and for normal placement. Add the regressions of A. Cost: the retry part repairs only when a later replay brings the same change again, so a failed load with no Try again keeps the stale tab. A live copy publishes nothing, and the first-load case stays. Effort: Medium.
  - **D.** Read the current session list after each successful replay, before the end places the tabs. While local tabs exist, skip that read, because `confirmSessions` places the session tabs of the view again, which the local tabs own. Use the stored-list update of A there. Cost: a request and a failure path for each replay. A failed replay keeps the stale tab until a later success, and a live copy publishes nothing. Effort: Medium.
  - **E.** One end of replay that works from state, with the first-load hold of B and the split helper of C.
    - At the end of the last running replay, after a success or a failure, compare the newest record of each known session with its published placement and with the stored lists. Place each session that differs.
    - Replace the tracked sessions and the shared `ready` set of `recordReplay` with that comparison. The comparison needs no tracked change, so a repeated event, a failed load, or a new paged input cannot leave a stale tab.
    - Place through the split helper of C. It always puts the session in the open or the closed list, also a session that first shows in the replay. It changes the tabs, their order, and the shown tab only when no local tabs exist. So the local tabs keep their order, the shown session, and the view. While local tabs exist, the stored lists can also follow each merged page.
    - This end rule replaces the narrower rule that a failed history load places nothing at its own end.
    - Change `recordReplay` in `src/chat/state/session-replay.ts` and the `place` callback at `src/chat/state/session-records.ts:89-107`. Make the changes of B to `src/chat/state/history.ts`, `loadChat`, the two guides, and the regressions. Add one regression for each read-only variant.
    - Risk: it changes the end of every replay. A prototype of the comparison with the first-load hold passed the same 37 files and 151 tests. Effort: Medium.
  - **F.** Make the stored lists a projection of the record owner. One function computes them after each update of the chat store. With local tabs, membership follows the newest shown records. Without local tabs, it follows the published placements. The order follows the view and the close times. Writers then change only records, placements, and navigation, so no writer can leave the lists stale. The projection alone does not fix the retry case, because without local tabs the lists follow the held placements. So add the end rule of E for the tabs. Cost: a new step on each store update, and the whole chat suite as its test surface. Effort: Large.
- **Left out:**
  - Rebuild the stored lists from the newest records only when Restore clears the local tabs. Effort: Small. It fails the root question: it repairs nothing before a Restore, so the read-only session history misses a session that first shows in a replay.
  - Publish the held changes of a failed load at once: it breaks the hold. B and E publish them at the end of the last running replay instead, and keep the first-load rule.
  - A Worker or wire change, such as a Restore event that carries the stored lists: E reaches the same state in the browser, with no change to the Worker, the wire, or older clients.
  - Change nothing: it fails the goal. The closed session stays an open and shown tab, and a message from it fails with HTTP 409 `session_closed`.
  - Hide a tab whose record says closed in the tab row: it fails the goal, because the shown tab and the saved view stay on the closed session.
  - Ordinary placement at the end while local tabs exist: it moves the shown session and its place in the view, so it breaks local read-only navigation.
  - Reload the whole chat at Restore: it fixes only the Restore symptom and drops browser state. The read-only session history still misses a session that first shows in a replay.
  - A session list read at Restore: it has the gap of the Restore-only rebuild, and it adds a request and a failure path.
  - Clear the local tabs when a replay changes the stored lists: it breaks local read-only navigation.
  - Hold the local tab actions until the replay ends: a close, a reopen, and a choice of a tab apply at once, also during a replay, as "Record order" says.
  - A separate fix of the live path of the stream: a live copy meets only a lag that a held replay left, and B and E settle that lag at the end. Under A, C, and D, a live copy still publishes nothing.
  - A guard or a test for the class that compares the stored lists with the records: it is a stricter validation or a test for the class, so it needs a user decision. The split of C and E needs neither.
- **Wider fix:** E. Its comparison from state needs no tracked change, and its split keeps the stored lists current at each placement while the local tabs keep the navigation.
- **Previous examples:**
  - Commit `b079cf2bf`, "fix(chat): preserve current tabs during history loads", fixed another defect in which the publication of records changed current tabs during history loads.
  - Commit `ca1c64e36`, "fix(chat): reopen read-only sessions in local close order (#538)", separated the local close order from the stored history order, and kept their different behaviour at Restore.
  - `plans/follow-ups/read-only-tabs-have-two-owners.md` is an earlier case of the same broad class: two copies of tab state drift apart.
  - No earlier case of a repeat after a failure was found.
- **Related:** `plans/follow-ups/read-only-tabs-have-two-owners.md`, the same code and a shared part of the wider fix. Its option B makes the browser view the one owner of the read-only tabs, and `placeSession` then skips its place step while read-only. That skip needs the membership-only split of E, so that live and replayed records still update the stored lists. When that item removes `archiveTabs`, the local test `archiveTabs !== null` of E must read the read-only state. Its B does not change the end of a replay, so it does not fix this item. E does not fix its two owners of the tab order. Keep both items.
- **Recommendation:** E. It settles every lagging record at the end of the last replay, also after a failure, and it keeps the first-load hold and local navigation. F best protects the stored lists, but it is Large and needs the end rule of E for the tabs.
- **Action:** fix after merge, apply E, because both cases are Rare and Medium, and the fix costs the same after the merge.
