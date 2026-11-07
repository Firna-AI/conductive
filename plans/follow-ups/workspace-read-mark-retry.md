# A failed or held read mark is never sent again

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #16, branch `conductor/boat-native-remote-workspaces-milestone-6`, round 2 finding 53. Updated on 2026-11-07, from branch `conductor/boat-native-remote-workspaces-milestone-8i`, review item 3 and its finding check.
- **Location:** `src/app/workspace-model.ts:188`, `:199`, and `:205`, `src/app/events.ts:122`, and `src/shell/workspace/shown-workspaces.ts:75`.
- **Reason:** Only a read request that fails, or that stays in flight across a leave and a return, causes it.

- **Terms:**
  - **Read mark:** the request that tells the Worker the last event number that the user saw in a workspace, so that the list stops showing it as unread.
  - **Kept model:** the `WorkspaceModel` that a browser tab keeps for each workspace that it showed. `src/shell/workspace/shown-workspaces.ts` keeps it, and each visit opens and closes the same object.
- **Background:**
  - The output that an open, visible workspace shows counts as read, as `src/app/README.md:119-123` and `src/app/workspace-model.ts:177-183` say. The list shows a workspace that finished with unread output in bold.
  - `markRead()` at `src/app/workspace-model.ts:184-214` sends the read mark with the newest event number. It runs when the applied state, the newest event number, or the visibility of the page changes.
  - One `reading` flag at `src/app/workspace-model.ts:35` lets one read request run at a time, for every open of the model. `close()` at `:102-108` counts the generation up and ends the subscriptions, but it does not clear `reading`.
  - Since 2026-11-07, the tab keeps one model for each workspace that it showed, and opens and closes it at each visit. Before, each visit made a new model, and its history replay sent a new mark.
- **Problem:** Three scenarios lose the newest read mark.
  1. A failed read request schedules no other attempt: `markRead()` returns at `:199`. A reconnect at the same event number sends no read mark. One HTTP 503 followed by a good reconnect reproduced it.
  2. A held mark across a return:
     - Open an unread workspace, and hold its read request through event 4.
     - Close and reopen the same kept model.
     - Deliver event 5 with the state unread, then let the held request succeed.
     - The Worker gets only the mark through event 4, and the model stays unread. A Node proof reproduced this.
     - The shared `reading` flag at `:188` blocked the newer mark. The generation check at `:205` then dropped the old answer, so it sent no newer mark.
  3. A return at the same event number:
     - A return asks only for the events after the last number of the kept model.
     - `open()` sets the detail before it subscribes, at `:83-96`. `Store.subscribe` at `src/app/store.ts:34-37` does not call the listener at once.
     - A history without a new event keeps the number, at `src/app/events.ts:122`.
     - So a return after a failed or held mark sends no mark. Only a new event, or a page that shows again, sends it.
- **Impact if no action:** The workspace list keeps showing unread output that the user already read. The row can stay bold across later returns, because a return at the same event number sends no mark.
- **Root question:** How does the newest event number that an open, visible workspace shows reach the Worker, whatever happened to an earlier read request, also one from an earlier open of the kept model?
- **Options:**
  - **A.** Schedule another read request after a failure. Keep the pending number across a close, and check the mark once at each open, in place of a cancel at close. Effort: Small.
  - **B.** Give read marks one owner in `src/app/` that stays with the kept model. Effort: Medium, for all three scenarios.
    - The owner keeps the newest shown event number and the newest number that the Worker confirmed, across a close and an open.
    - It sends one request at a time. After each answer, and once after each open applies its detail, it sends again when the workspace is open, visible, and unread, and the shown number is higher.
    - A failure tries again later through `AppServices.delay`. `close()` stops that timer and keeps both numbers.
    - Apply the confirmed read through `apply`, so that the list row updates too.
    - Move the owner out of `src/app/workspace-model.ts`, which has 215 lines.
    - Add regressions to `src/app/workspace-model.test.ts` for the three scenarios. Its read tests at `:151`, `:184`, and `:221` use one open only.
    - Update `src/app/README.md:119-123` and `:193-197`, because an answer after a close can then send the mark of a newer open.
    - Risk: a request that never answers holds back the next mark. The API client at `src/app/api/client.ts:58-81` has no timeout.
  - **C.** Send the seen event numbers as socket acknowledgements, and let the server save them. This changes the browser and backend contracts. Effort: Medium.
- **Left out:**
  - A new `WorkspaceModel` for each visit, made in `src/shell/workspace/` with the kept event number and detail copied in: it fails the goal, because a return at the same event number still sends no mark. The shell would also change the stores of another owner, against the rule at `src/app/store.ts:4`.
  - One visit object in `WorkspaceModel` for all the state of one open: B covers it, because `close()` already ends the other state of an open.
  - An abort of the pending request at close: the API client has no abort, and the Worker can still apply the aborted mark. So it needs the same one-request rule as B.
  - Change nothing: it leaves seen output unread.
- **Wider fix:** B. One owner keeps the newest shown number until the Worker confirms it, whatever happened to an earlier request.
- **Previous examples:** `plans/follow-ups/chat-stop-after-failed-history.md`, a failed history read with the same shape.
- **Related:** None. The other change to `WorkspaceModel.open()` and `close()` from the same review is merged: the open workspace owns its input subscription through `AppServices.onInput`.
- **Recommendation:** B. One owner fixes the three scenarios in one pass over the same lines. It sends one request at a time, as `src/app/README.md:98-101` asks for the saves of one value.
- **Action:** fix after merge, apply B, because only a read request that fails, or that stays in flight across a leave and a return, causes it.
