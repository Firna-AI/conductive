# Late text can reopen a turn that the chat never saw

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #29, branch `conductor/boat-native-remote-workspaces-milestone-7s`, round 3 finding 4.
- **Location:** `worker/chat/turn-events.ts:68`, `src/chat/state/known-turns.ts:28`, `src/chat/state/turn-events.ts:152`, and `src/chat/state/message-actions.ts:159`.
- **Reason:** a Rare product bug, and its fix changes the browser chat, outside the files of PR #29.

- **Terms:**
  - **Late event:** a valid agent event of a turn that already ended. Decision 104 E stores it, and it never reopens its turn.
  - **Refusal marker:** a stored chat event that names a runner event that the workspace refused, as decision 76 says.
- **Background:** The workspace knows that an event is late when it stores it. The chat in the browser decides on its own, from the turns that it saw. It adds a turn to its list only when it accepts an agent event of that turn.
- **Problem:** When the workspace refuses both the start and the end of a turn, the chat never sees that turn. A late text event of the turn then adds it as the newest turn and shows it as running, while the workspace runs a newer turn. A late end of such a turn can also make the running turn look ended.
- **Impact if no action:** The chat shows the wrong turn as running, and Stop names that ended turn, so it does not stop the agent. A reload shows the same wrong state.
- **Root question:** How does the chat keep the turn of a late event ended, and the running turn unchanged, also when the chat never saw that turn?
- **Options:**
  - **A.** Create the chat's record of a turn from `message.sent`, so that a later refusal marker can end it. A continuation turn gets no `message.sent`, so it stays open. Effort: Small.
  - **B.** Keep one chat record of each turn from `message.sent` and the ordered `session.updated` records, and use it for late events and Stop. The chat must then keep the `session.updated` records that it drops now. Effort: Medium.
  - **C.** Send the stored turn states with the history and the live events, and replace the chat's own turn rules. Effort: Large.
  - **D.** The workspace marks each late event that it stores, and the runner cannot set the mark. The chat folds a marked event as late. The event then adds no turn and changes no running turn. If the chat still shows that turn as running, the mark ends it. This changes the shared event contract on both sides, and it keeps the behaviour of decision 104 E. Effort: Medium.
- **Left out:**
  - Refuse the late text, because it breaks decision 104 E, which keeps real agent text.
  - Send an invented end event after a refused end, because the chat would show an end that the runner never sent.
  - Use a refused end of an unknown turn as the record of that turn, because the chat cannot tell it from a refused late end of an older turn.
- **Wider fix:** D. The chat no longer guesses which events are late, however it missed the turn.
- **Previous examples:** commit `841bc3d`, the late events of a turn that the chat knows.
- **Related:** `plans/follow-ups/chat-refused-turn-end.md`, a wider class: a running state in the chat that differs from the workspace.
- **Recommendation:** D. The workspace already makes the decision, so a mark removes the guess with the least chat code.
- **Action:** fix after merge, apply D, because it is a Rare product bug that needs browser changes outside PR #29.
