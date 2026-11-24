# A failed Ask behind a file tab loses the question

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from the branch `calummoore/ask-explain-custom-message-7bnf`, item 2 of the Ask UI milestone.
- **Location:** `src/chat/explain/useAsk.ts`, `src/chat/WorkspaceChat.tsx:205`.
- **Reason:** The case needs a failed start while a file tab shows, which normal use rarely meets, and the fix moves state into the chat store.

- **Terms:**
  - **Ask:** the action next to Explain by a selection of chat text. The member writes a question in a popover, and Send starts an explanation session with it.
  - **Unsent Ask:** the state of an Ask before its session starts: the saved quote and the typed question. `useAsk` in `src/chat/explain/useAsk.ts` holds it in React state.
- **Background:** `docs/protocol/explain-ask.md` says that a failed start opens the unsent popover again with the question, so the member loses no typed text. The unsent Ask lives in React state inside `SessionChat`. When a file tab shows, `WorkspaceChat` draws the file in place of `SessionChat`, so that state goes away.
- **Problem:** When a member sends an Ask, then opens a file tab, and the start fails, the question is lost. A start that succeeds keeps the typed text, because it goes into the draft of the new session in the store.
- **Impact if no action:** In this rare case the member must type the question again.
- **Root question:** How does an unsent Ask outlive the view that shows it?
- **Options:**
  - **A.** Keep the unsent Ask in the store of `ChatController`, by parent session, as the store keeps drafts. Effort: Medium.
  - **B.** Keep it in a React context above the content switch in `WorkspaceChat`. It still goes away with a reload or another workspace. Effort: Medium.
  - **C.** Change nothing. Effort: Small.
- **Left out:** Moving the question into the message field of the parent session, because no doc says so and it mixes the question with that draft.
- **Wider fix:** A. The store then owns each piece of typed text that must outlive a view.
- **Previous examples:** None found.
- **Recommendation:** A. The store already keeps drafts alive across views in the same way.
- **Action:** fix after merge, apply A, because the case is rare and the fix changes `src/chat/state/`, outside the scope of the Ask change.
