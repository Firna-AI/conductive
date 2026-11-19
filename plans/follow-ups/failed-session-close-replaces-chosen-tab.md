# A failed close replaces the chosen tab

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-19, from branch `calummoore/follow-up-a-late-linked-reply-replaces-c5cr`, in a side check that the user asked for while that branch kept the chosen tab for linked replies.
- **Location:** `src/chat/state/close-actions.ts:55-60`, the check of a failed close before its call of `selectSession`. `src/chat/state/close-actions.ts:15`, `shown` of `placeBefore`. `src/chat/state/sessions.ts:45`, `showsSession`.
- **Reason:** The branch that found it fixes only linked replies, and the user asked to record this close check, not to fix it.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Session of the chat:** `activeSessionId` of the chat snapshot, the session that the member saw last, which stays while a file, diff, or Preview tab shows.
  - **Selected tab:** `view.activeTab` of the workspace view, which is a session, file, diff, or Preview tab, or null when no tab is selected.
  - **Preview tab:** a desktop tab of the centre row that shows the page of one port of the cloud computer.
  - **Optimistic close:** a close that shows at once, before the reply. The tab moves to the session history, and the next tab shows.
  - **Tab choice counter:** `tabChoices.count` in `src/chat/state/context.ts`. `selectSession` raises it at each choice of a shown session.
- **Background:**
  - `closeSession` in `src/chat/state/close-actions.ts` closes one session. `requestClose` and `confirmClose` of the same file call it.
  - Before the close, `placeBefore` records the place of the tab in the row, and `shown`. `shown` is true when the session is the session of the chat. It does not read the selected tab.
  - `beginEdit` of `src/chat/state/session-records.ts` then makes the optimistic close. When the closed session was the session of the chat, the next session becomes the session of the chat. When the closed tab was the selected tab, the tab of that next session becomes the selected tab.
  - Then `closeSession` records `after`: the session of the chat and the tab choice counter.
  - When the close request fails, the catch puts the tab back at its place, and `edit.fail()` takes back the pending edit. Then the catch calls `selectSession(context, sessionId)` when all of these hold:
    - `before.shown` is true.
    - The tab choice counter did not change.
    - The session of the chat is still `after.shown`.
  - `selectSession` in `src/chat/state/session-actions.ts` makes the restored session the session of the chat, makes its tab the selected tab, and saves the view.
  - The app selects a file, diff, or Preview tab through `ChatController.updateView` in `src/chat/state/controller.ts`. It calls `updateView` of `src/chat/state/session-actions.ts`, which changes only the view. So the tab choice counter and the session of the chat stay, and the check still passes.
  - The rule is in section Record order of `src/chat/loads-and-sends.md`: "A failed close puts the tab back at its place in the row. When the close moved the user off that tab and the user chose no other tab since, the tab shows again." The doc comment of `closeSession` says the same.
  - Section Sessions of `docs/protocol/agents-and-sessions.md` requires: "When the close fails, the tab returns to its place in the row, and a notice says that the session did not close." No protocol doc states which tab shows after a failed close.
  - `showsSession` in `src/chat/state/sessions.ts` is true when a session is the session of the chat, and the selected tab is a session tab or null. `applyMoves` in `src/chat/state/model-moves.ts` and `showTarget` in `src/chat/state/linked-replies.ts` call it before they select a new session.
  - The tests of `src/chat/state/close-actions.test.ts` cover a failed close with no choice, which shows the tab again. They also cover a choice of another session tab during the close, which stays. No test selects a file, diff, or Preview tab during the close.
  - A one-time Vitest test reproduced the defect on 19 November 2026, and failed one assertion:
    - It used `chatFor` of `src/chat/state/test-kit.ts` with `conversation: 'history'`. It held the close request, a `POST` to a path that ends in `/close`. Its answer to that request was status 503, with the body `{ "error": "The server failed." }`.
    - At the start, the session of the chat was `autocomplete`, which is `FAKE_IDS.session`, and its tab was the selected tab.
    - `chat.controller.requestClose('autocomplete')` made the optimistic close. While the request waited, the session of the chat was `debounce`, and its tab was the selected tab.
    - `chat.controller.updateView` then selected a Preview tab of port 3000. The session of the chat stayed `debounce`.
    - The held request then went, and the close failed. The session of the chat became `autocomplete`, and its tab became the selected tab.
    - The test expected `{ activeTab: { kind: 'preview', port: 3000 }, activeSessionId: 'debounce' }`. It received `{ activeTab: { kind: 'session', sessionId: 'autocomplete' }, activeSessionId: 'autocomplete' }`.
    - The test file was removed after the run, so no failing test stays in the source.
- **Problem:** When the member selects a Preview tab while a close waits, and the close fails, the chat selects the restored session tab. The member chose the Preview tab after the close, so this breaks the rule of `src/chat/loads-and-sends.md`. A file or diff tab takes the same `updateView` path.
- **Impact if no action:** A failed close takes the member away from the page of a port, the file, or the diff that the member chose to look at.
- **Root question:** How does a failed close show the restored tab again only when the member chose no other tab, of any kind, since the close?
- **Options:**
  - **A.** In the catch of `closeSession`, also require that the selected tab is a session tab or null, with an inline check. This copies the tab rule of `showsSession` into a third place, so the late paths can drift apart again. `shown` of `placeBefore` still reads only the session of the chat. Effort: Small.
  - **B.** Use `showsSession` in `closeSession`. In the catch, keep the check of the tab choice counter. When `after.shown` names a session, replace the comparison of the session of the chat with `showsSession(context.store.get(), after.shown)`. `after.shown` can be null, such as after a close of the last open session. Then require that the session of the chat is still null and that no tab is selected. Also compute `shown` of `placeBefore` with `showsSession`, because the close moves the member off a tab only when that tab shows. Effort: Small.
  - **C.** Make the tab choice counter also count each change of the selected tab through `updateView`. The current check then sees a file, diff, or Preview choice. `showAddressSession` in `src/chat/state/address-session.ts` reads the same counter, so a session address lookup would then also stop at such a choice. That change needs its own check and tests. `shown` of `placeBefore` still reads only the session of the chat. Effort: Medium.
- **Left out:**
  - Change nothing, and change the rule of `src/chat/loads-and-sends.md`. It fails the goal, because the failed close still takes the member away from the chosen tab.
  - Never show the restored tab after a failed close. It removes the show of the tab that the rule states. The test "puts the tab back in its place and shows it again when the close fails" of `src/chat/state/close-actions.test.ts` checks that show.
  - Keep the selected tab, but make the restored session the session of the chat. A later fixed prompt or Add to chat would then go to the restored session, not to the session that the member saw last. Section Messages from the bar of `docs/protocol/messages-and-attachments.md` and section Add to chat of `docs/protocol/file-mentions.md` require that session.
  - Keep the closed tab in the row until the reply. It breaks the requirement of section Sessions of `docs/protocol/agents-and-sessions.md` that a close shows at once, before the server confirms it.
- **Wider fix:** B. The failed close then uses the same check as the delayed model move and the linked reply. So one late path cannot fall behind the others again.
- **Previous examples:** Commit `d1ec85ee7` of 8 November 2026 kept a newer session, file, or diff tab selected in `applyMoves` of `src/chat/state/model-moves.ts`, for a delayed model move. Commit `b0efec267` of 19 November 2026 extended that check to each selected tab whose kind is not `session`, such as a Preview tab. The branch that added this item gave the same check to the branch of `showTarget` that moves no draft. It added `showsSession`, which `applyMoves` now also calls.
- **Recommendation:** B. It keeps the chosen tab and shares one check with the other late paths, at the same effort as A.
- **Action:** fix after merge, apply B, because the branch that found it fixes only linked replies, and the user asked only for a record.

Constraints for the fix, which every option keeps:

- Keep the optimistic close. Section Sessions of `docs/protocol/agents-and-sessions.md` requires it, and the user asked for it on 16 November 2026.
- Keep the restored tab at its place in the row, and keep the notice "The session didn't close". The same section requires both.
- Keep the current rule of the notice in `closeSession`. The notice goes to the restored session when that session is the session of the chat, else to the chat.
- Keep the show of the restored tab when the close moved the member off it and the member chose no other tab since. Section Record order of `src/chat/loads-and-sends.md` states it.
- Keep the current path of a view with no selected tab, as `showsSession` does.

Regression tests for the fix:

- Add a test to `src/chat/state/close-actions.test.ts`. Build the chat with `chatFor`, as the test "keeps the tab that the user chose during a failed close, and shows the notice there" does. Use its hold of the close request and its answer of status 503.
- In that test, start the controller, and call `chat.controller.requestClose(FAKE_IDS.session)`. Wait until `chat.held` holds one request.
- Then select a Preview tab of port 3000 with `chat.controller.updateView`. Add the tab to `tabs`, and make it `activeTab`.
- Release the request with `chat.held.splice(0, 1)[0]()`, and await the close.
- Expect the Preview tab to stay the selected tab, and `debounce` to stay the session of the chat. Expect the tab of `autocomplete` back at its place in the row.
- Expect the notice "The session didn't close" of the chat, with no session, as the test of a chosen session tab expects.
- Keep the three tests of `src/chat/state/close-actions.test.ts` as they are. They must pass with the fix.
