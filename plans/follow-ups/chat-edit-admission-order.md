# Quick edits from one tab can commit reversed

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from PR #53, branch `conductor/boat-native-remote-workspaces-milestone-8m`, a new problem outside the scope that the round 1 check of finding 10 found.
- **Location:** `worker/chat/backend.ts:102` and `:105`, `worker/chat/browser-authorization.ts:19` and `:30`, `src/chat/state/model-actions.ts:68`, and `src/chat/state/session-actions.ts:92`.
- **Reason:** This branch does not touch the order of authorization and queue admission. The required order of overlapping edits is not established.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Edit:** a rename of a chat session, or a change of its model, which the browser sends at once.
  - **Serial queue:** `ChatStore.run` in `worker/chat/store.ts`, which runs the chat work of one workspace object one task at a time.
  - **Authorization reads:** the awaited checks of a browser request before its route runs: the request gate and the workspace read.
- **Background:**
  - Conductive shows each agent conversation of a workspace as a chat tab. The user can rename a session, and each session has its own model picker.
  - The browser sends each edit at once, also while an earlier edit of the same field waits, at `src/chat/state/model-actions.ts:68` and `src/chat/state/session-actions.ts:92`. The model picker stays on while a change waits.
  - In each workspace object, `WorkspaceChat.fetch` in `worker/chat/backend.ts` first awaits `authorizeBrowser`, at line 102. Only then does it enter the serial queue with `this.store.run`, at line 105. The route commits the edit inside the queue.
  - `authorizeChatBrowser` in `worker/chat/browser-authorization.ts` awaits the request gate, at line 19, and then the workspace read `findChatWorkspace`, at line 30.
  - The gate in `worker/security/gate.ts` checks the session signature, and reads the session user and the org membership from D1. It also reads the JSON body of a write.
  - The workspace gives each committed change the next event number. Each tab then shows the record with the highest event number.
- **Problem:** A static trace of the code shows that two quick edits from one tab can commit in reverse order.
  1. A tab sends edit 1, such as Sonnet, and then edit 2, such as Fable, for one session.
  2. Both requests run their authorization reads at the same time, outside the serial queue.
  3. When the reads of edit 2 end first, edit 2 enters the queue and commits first.
  4. Edit 1 then commits, and it replaces the field with the older value.
  5. Edit 1 now has the higher event number. So each tab shows the older value as the newest record, and the Worker keeps it.
  - The network can also deliver two requests in another order than the browser sent them. The trace covers only the authorization step.
  - No existing reproduction ran. The trace comes from a read of the code.
  - The contract is unknown. No requirement says which of two quick edits from one tab must win.
  - `docs/protocol/chat-and-events.md` says only three things here. The user can rename a session, and each session has its own model picker. Every open tab gets the same events in the same order.
  - So it is not settled whether the last pick of the user must win, or whether the last committed edit may win.
- **Impact if no action:** In rare timing, the session keeps the older name or model after the user picked a newer one. The next message then runs on the older model, until the user picks again.
- **Root question:** Which of two quick edits from one tab must the workspace keep, and which part of the system must keep that order?
- **Options:**
  - **A.** Keep the order of the commits, and state the rule: the last committed edit wins, and each tab shows it by event number. It needs no code change, but it adds a requirement. Effort: Small.
  - **B.** Investigate before any behavior change. Effort: Medium.
    - Write a reproduction. Delay the authorization reads of the first of two quick renames, and let the second finish first. Then read the stored name and the event numbers.
    - Check whether normal use sends two edits of one field at once, and how often the network reorders them.
    - Find the required order of overlapping edits. When no requirement settles it, bring that order to the user as its own decision, with the facts of the reproduction.
    - Then propose one of the other options at its ownership point.
  - **C.** In the browser chat state, send the next edit of a field only after the earlier edit of that field answers. The pending edit still shows at once. A later edit then waits behind an unanswered request, and the API client has no timeout. Effort: Medium.
  - **D.** In `WorkspaceChat.fetch`, admit each browser write into the serial queue before its authorization reads, and authorize it inside the queue. The writes then commit in their order of arrival at the object. The authorization reads then hold the queue, and the network can still reorder two requests. Effort: Medium.
  - **E.** Turn off the model picker and the rename field of a session while an edit of that field waits. Edits of one field from one tab then never overlap. It is a visible change beyond the protocol, and it can need a mockup state. Effort: Medium.
  - **F.** Give each edit an edit ID or a sequence number of its tab. The Worker then skips an edit that a later edit of the same tab replaced. It covers every order of arrival. It changes the protocol and adds a requirement at the API boundary. Effort: Large.
- **Left out:**
  - A fix in the display only: the browser already shows the newest committed record, and the Worker still keeps the older value.
  - Choose one of A or C to F now, before the investigation: each sets the order rule. No requirement says yet which edit must win.
- **Wider fix:** F, if the investigation shows that the last pick of the user must win. Only an edit identity covers every order of arrival, for every tab. Until then, none.
- **Previous examples:** None found.
- **Related:** [chat-session-record-owner.md](chat-session-record-owner.md): the same edits, in the browser display. That fix shows the newest record that the server keeps, so here it shows the older value too. Its one-queue option for the edits of a tab is option C here.
- **Recommendation:** B. A reproduction and the required order of overlapping edits must come before any behavior change, because no requirement sets that order yet.
- **Action:** fix after merge, apply B, because this branch does not change the admission order, and the contract needs a check first.
