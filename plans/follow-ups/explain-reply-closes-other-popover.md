# A late Explain reply closes another session's popover

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from the review of the branch `calummoore/ask-explain-custom-message-7bnf`, round 1, check of finding 5.
- **Location:** `src/chat/explain/useExplain.ts:92-100`.
- **Reason:** The code is on `main`, so the fix belongs in its own branch.

- **Terms:**
  - **Explain:** the button by a selection of finished chat text that starts an explanation session, whose answer shows in a popover by the text.
- **Background:** A press on Explain waits for the reply of the Worker. The reply clears the selection and opens the popover of the new explanation. The member can move to another session tab while the reply waits.
- **Problem:** A reply that comes after the move closes the popover or the menu of marks that the member opened in the other session, and it clears the selection there.
- **Impact if no action:** The member loses the popover or the selection that they work with in the other session.
- **Root question:** What does a late Explain reply do when its parent session no longer shows?
- **Options:**
  - **A.** Act on the popover and the selection only while the parent session shows. The new tab and the mark still appear. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** Moving the member back to the parent session, because the reply of a start keeps the shown tab.
- **Wider fix:** None. The Ask branch applies the same rule to Ask as its finding 10.
- **Previous examples:** Finding 10 of the Ask review fixed the same case for Ask.
- **Recommendation:** A. It matches the Ask fix and keeps the member's work in the other session.
- **Action:** fix after merge, apply A, because the code is on `main` and outside the Ask change.
