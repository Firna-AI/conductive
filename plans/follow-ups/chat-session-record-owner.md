# The newest accepted session record can stay hidden

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #53, branch `conductor/boat-native-remote-workspaces-milestone-8m`, round 1 findings 10 and 11 and their finding checks, merged into one item.
- **Location:** `src/chat/state/session-records.ts:89-106` (`beginEdit` and its end step), `src/chat/state/model-actions.ts:68-83` (`chooseModel`), `src/chat/state/session-actions.ts:92-98` (`renameSession`), `src/chat/state/history.ts:26`, `:52-54`, and `:60-62` (the history load), and `src/chat/state/apply-events.ts:35` and `:60` (the socket batch).
- **Reason:** Each case needs rare timing. The fix stays in the browser, with no stored data and no public message, so it costs the same later.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Session record:** the server state of one chat session, with its name, model, open state, login result, and active turn.
  - **Pending edit:** a rename, or a model change of the same agent, that the chat shows at once, before its reply.
  - **Event number:** the server number that orders the stored changes of a workspace, which each reply, read, and event carries for its state.
  - **SessionLog:** the browser class in `src/chat/state/session-log.ts` that keeps the events and the newest record of one session.
  - **Record owner:** `SessionLog.record` with the functions of `src/chat/state/session-records.ts`, which together give the shown record of each session.
- **Background:**
  - Conductive shows each agent conversation of a workspace as a chat tab. The shown record of a session sets the tab name, the composer model, the login line, and the Send block.
  - The decision in force orders the records by event number: the newest number wins, whatever arrives first. A pending edit shows at once over the newest record. The decision was recorded on 2026-11-06, and this branch applied it in `cf2e41a`.
  - The record owner takes four inputs. They are the replies of rename, model change, close, reopen, and Send, the first-load session list, the history pages, and the socket batches.
  - Both cases below need rare timing. The edit case needs two waiting edits of one field, with the newer reply first.
  - The history case needs a history reply that passes the socket copy of the same event. A live socket gets each event when it commits, and a history request reads 32 workspace events, so its newest events come last. So the stream must be behind, such as after a dropped connection or a sleep, while the user opens a session that has not loaded.
  - Design call, 2026-11-08: the orchestrator of Milestone 8m merged the two cases into one fix. The fix completes the existing record owner, with no new owner module.
- **Problem:**
  - Overlapping edits:
    - The user picks Sonnet, then Fable, for one session, and both requests wait. Each pick starts a pending edit through `beginEdit`.
    - The Fable reply arrives first, with the higher event number. `confirmRecord` takes it, and the end step removes only the Fable edit.
    - `shownRecord` then lays the older Sonnet edit over the confirmed Fable record. So the tab and the model picker show Sonnet.
    - The Sonnet reply comes later. `SessionLog.offer` refuses it as older, and the end step removes the Sonnet edit. Only then does Fable show again.
    - Two renames have the same defect, because `renameSession` uses the same edit steps.
    - The code before this branch showed Fable at each step, because its `placeIfNewest` refused the older reply by a local version. So this branch caused the defect.
  - History publication:
    - `history.ts:26` merges each history page into the SessionLog of the session. A newer `session.updated` event in a page becomes the newest record, at `session-log.ts:128-138`.
    - The load then shows only the transcript, on success at `history.ts:52-54` and on failure at `history.ts:60-62`. It never places the record in the tabs.
    - When the socket brings the same event, `merge` finds no new event number, and `apply-events.ts:35` skips the session. So `placeShown` at `apply-events.ts:60` never runs for that record.
    - The code before this branch showed the record, because its stream batch placed the last record of each session, also a repeated one. So this branch caused this defect too.
- **Impact if no action:**
  - The tab shows an old name, model, open state, or login result. The edit case lasts until the older request answers, and the API client has no request timeout.
  - The history case lasts until another record of the session arrives, an edit in this tab places it, or the chat loads again.
  - Send sends the shown model, at `src/chat/state/message-actions.ts:109`. The Worker saves that choice as the session model, at `worker/chat/messages.ts:94`. So a Send in that window stores the older model.
  - An old `loginAvailable: false` blocks Send in the reader's own session. An old open state keeps a closed session as a tab, and Send then gets "Reopen the session to send a message."
  - The model picker stays on while a change waits, at `src/chat/components/Composer.tsx:121`. So the user can make the overlapping edits.
- **Root question:** How does the chat keep the newest accepted session state visible, and use it for Send, whichever input brings that state first?
- **Options:**
  - **A.** Two direct fixes, with no owner contract. Each rename and model action retires older edits of the same field when its reply confirms. Each history load, on success and on failure, shows the record only when the newest record changed. Each input path then repeats the rule, and a new input can miss it. Effort: Small.
  - **B.** Complete the existing record owner in `src/chat/state/session-records.ts`, with no new module. Effort: Medium.
    - `beginEdit` gives a confirm step and a fail step in place of its one end step.
    - Confirm takes the reply record through `SessionLog.offer`. It ends this edit and each older edit of the same field, and it shows the result once.
    - Fail ends only its own edit. The edits of other fields stay.
    - One new function merges the events of a session into its log and gives the snapshot change. It shows the transcript, and it shows the record only when the newest record changed.
    - That real change check is the one that `apply-events.ts` makes with `log.record !== before`. So the local tabs of an archived workspace keep their focus, because its records do not change.
    - Each history page uses the function, on success and on failure. The socket batch uses it too, and keeps its record order and its draft moves.
    - Duplicate removal by event number stays in `SessionLog`, apart from the check whether the display needs an update.
    - Risk: on the first load, history can place the shown record before the session list fills. The final list update of `loadChat`, at `src/chat/state/load.ts:100-110`, still replaces both lists from the records that `shownRecord` gives.
    - The source comments of `session-records.ts`, `session-actions.ts`, and `model-actions.ts` change with the code.
    - The edit part alone is Small. Medium fits the combined change with the history tests.
  - **C.** Send the session edits of a tab through one queue in the browser, keep their pending display, and add the history part of B. This stops reversed replies for one tab. A later edit then waits behind an unanswered request, and the API client has no timeout. Effort: Medium.
  - **D.** Turn off the model picker and the rename field of a session while an edit of that field waits. The pending edit still shows at once, and the history part of B stays. This is a visible change beyond the protocol, so it needs a user choice and maybe a mockup state. On a slow network, the controls stay off longer. Effort: Medium.
  - **E.** B, and change the placement step, `placeSession` at `src/chat/state/sessions.ts:102`. Effort: Medium.
    - It changes the focus, the view, and an open dialog only when the record takes the session out of the shown tabs, which `tabSessions` gives.
    - A repeated, late, or derived placement then cannot select a hidden session or close a local tab of an archived workspace.
    - It also covers an archived workspace whose stream missed a record from before the archive. There, B alone can still move the focus.
    - It changes `sessions.ts` and `archive-view.ts`, and it adds a focus test for the archived reader.
  - **F.** Send an edit ID with each rename and each model change, and let each session record name the last edit of each field. Effort: Large.
    - The owner then ends each covered edit and each older edit of that field, from a reply, a read, or the stream.
    - The same IDs let the Worker skip an edit that a later edit of the same tab replaced.
    - Only F also covers an edit whose reply is lost.
    - It changes the protocol and adds a requirement at the API boundary, with Worker and browser work. So it needs a user choice.
- **Left out:**
  - Change nothing: it fails the goal, and Send can store the older model.
  - Remove every pending edit after any reply: it also removes newer edits and edits of other fields.
  - Show only confirmed records while an edit waits: it breaks the decision in force that a pending edit shows at once.
  - Keep one pending edit for each field, which a newer edit replaces. When the newer edit fails while the older one waits, the old confirmed value shows. But the older edit can still succeed. A is better on every point.
  - Show the record after every history load: in an archived workspace, `showArchived` makes a closed session the shown session. `placeSession` then moves the focus to a neighbour that can have no local tab, and the check at `src/chat/state/archive-view.test.ts:30` fails.
  - Handle only the socket duplicate: the old model stays for Send until the socket copy arrives.
  - Remove the duplicate check: it breaks the rule that no tab shows an event twice.
  - Read the ordered session list after each history load: `offer` takes only a strictly newer record, at `session-log.ts:150`. When no workspace event follows the record from history, the list has the same number, and the tab stays old. It also adds a request and a failure path to each history load.
  - Add the session record to each history reply in the Worker: A is better on every point. A needs no API change, and the browser must still show the record.
  - Hold the history records until the stream reaches them: the display stays old for the whole gap. After a failed history load, the chat also shows Stop from those records.
  - A test of every input order for every record: it is a test for the whole class, and such a test needs a user choice. Each option keeps its regression tests.
- **Wider fix:** B. One owner keeps the confirmed records, the pending edits, and the display in order for every input. E adds a safe navigation default. Only F also covers a lost reply.
- **Previous examples:** Commit `f5018e0` fixed older session replies and rollbacks across asynchronous actions, and joined session selection with history loading. Commit `61b3d34` made the session records from history decide retry permission. Commit `cf2e41a` added the order by event number that these cases miss. No earlier publication failure of this kind was found.
- **Related:**
  - [chat-guides-current-code.md](chat-guides-current-code.md): its recommended guide fix links to the header comment of `session-records.ts`, which this fix updates. So those guides stay current when this fix lands.
  - [chat-edit-admission-order.md](chat-edit-admission-order.md): the same edits, at the Worker. This fix shows the newest record that the server keeps. It does not change which of two quick edits the Worker keeps.
  - [model-change-reply-focus.md](model-change-reply-focus.md): the same model-change actions in `src/chat/state/model-actions.ts`. Apply the two fixes one after the other. That item's Related line still names the consumed `plans/follow-ups/chat-client-stale-records.md`. Replace that reference with a source permalink when this owner fix lands.
- **Recommendation:** B, as the orchestrator of Milestone 8m chose on 2026-11-08. It closes both cases in the existing owner, keeps the server order and the pending display, and needs no protocol or control change. E best protects the codebase, because it also stops a late or repeated placement from moving the focus of an archived reader.
- **Action:** fix after merge, apply B, because each case needs rare timing, and the browser-only fix costs the same after the merge.

Regression cases through the public chat controller. No case ran for this item. A static trace found the defects.

1. Model picks: the test "keeps the later of two model picks when their answers arrive in reverse order" in `src/chat/state/controller-actions.test.ts:166-192` gets one more check. Right after `await second` at line 188, the session choice must be Fable. The end check at line 192 stays.
2. Renames: in `src/chat/state/stale-records.test.ts`, two renames wait, and the second reply succeeds first with the higher event number. The title must stay the second name at once, and after the first reply.
3. History race: start a loaded chat with a second session that has not loaded. Its history reply holds a newer `session.updated` rename. Select that session: its tab must show the new name. Then the socket brings the same numbered record: the name must stay.
4. Failed later page: as case 3, but a later history page fails after the page with the record. The tab must still show the new name.
5. Archived reader: `src/chat/state/archive-view.test.ts` keeps passing, with the focus check at line 30.
6. First load: history can place the shown record before the session list fills. After the load ends, both lists must hold the listed sessions, with their newest records.
