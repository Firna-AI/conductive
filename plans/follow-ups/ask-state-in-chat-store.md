# Keep the unsent Ask in the chat store

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from the branch `calummoore/ask-explain-custom-message-7bnf`: item 2 of the Ask UI milestone, and the wider fix of review findings 2, 5, 6, and 7 of round 1.
- **Location:** `src/chat/explain/useAsk.ts`, `src/chat/explain/ask-state.ts`, `src/chat/explain/useExplain.ts`, `src/chat/explain/ExplainLayer.tsx`, `src/chat/explain/MarkedMessage.tsx`, `src/chat/WorkspaceChat.tsx:205`.
- **Reason:** Each case needs a failed start with a move away from the chat, or an archive while an Ask is open, which normal use rarely meets, and the fix moves state into `src/chat/state/`.

- **Terms:**
  - **Ask:** the action next to Explain by a selection of chat text. The member writes a question in a popover, and Send starts an explanation session with it.
  - **Unsent Ask:** an Ask before its session starts, or after its start failed: the saved quote and the typed question. `useAsk` holds it in React state inside `SessionChat`.
  - **Range:** a browser object that points to the start and end of a passage of the page.
- **Background:** `docs/protocol/explain-ask.md` says that a failed start opens the unsent popover again with the question, so the member loses no typed text. The chat shows at most one popover, and a read-only workspace shows no Ask. Today `useAsk` keeps one Ask for each parent session in React state, and it keeps the quote as a `Range`.
- **Problem:** Four defects share this state:
  - A file tab draws in place of `SessionChat`, so a start that fails while a file tab shows loses the question.
  - A failed start opens the unsent popover again over a popover that the member opened during the wait, so two popovers show (review finding 5).
  - After a move to another session and back, the kept `Range` points outside the current message, so the highlight goes and the popover sits away from its quote (review finding 6).
  - An open Ask stays editable when an archive makes the chat read-only (review finding 7).
- **Impact if no action:** In these rare cases the member loses the question, sees two popovers, or sees the popover away from its quote, or types into an Ask that cannot send.
- **Root question:** Where does an unsent Ask live, so that it outlives the view, shows in one popover at a time, stays by its quote, and follows the write permission?
- **Options:**
  - **A.** Keep each unsent Ask in the store of `ChatController`, by parent session, as text and anchor data with no `Range`. Give the shown chat one popover state with an Ask variant and an explanation variant. `MarkedMessage` finds the kept quote with `findQuote` after each mark layout, as it does for marks, and draws the highlight and the anchor box from it. Hide the Ask in a read-only chat with the rule of `permittedOverlay`, and end it in `afterRestore`. Effort: Medium.
  - **B.** Fix each defect in place: clear the shown explanation when a failed Ask reopens, resolve a new `Range` on reopen, hide the Ask while read-only, and keep the state in a React context above the content switch in `WorkspaceChat`. Effort: Medium.
  - **C.** Change nothing. Effort: Small.
- **Left out:** Moving the question into the message field of the parent session, because a later Send then gives it to the parent agent. Keeping every transcript mounted, because it costs memory and still breaks the `Range` on a redraw inside a transcript.
- **Wider fix:** A.
- **Previous examples:** The store keeps drafts alive across views. `src/chat/explain/mark-layout.ts` already finds quotes in the current message text.
- **Recommendation:** A. One store entry and one popover state fix all four defects and match how marks and drafts already work.
- **Action:** fix after merge, apply A, because each case is rare and the fix changes `src/chat/state/`.
