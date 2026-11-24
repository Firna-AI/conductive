# Send leaves the focus off the message field

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from the branch `calummoore/ask-explain-custom-message-7bnf`, the wider fix of review finding 4 of round 1.
- **Location:** `src/chat/components/ComposerButtons.tsx:45`, `src/chat/components/Composer.tsx:241`, `src/chat/explain/FollowUpField.tsx:66`.
- **Reason:** The change alters the main composer and the follow-up field on `main`, so the user must approve it.

- **Terms:**
  - **SendButton:** the shared Send of the main composer, the follow-up field of an explanation popover, and the Ask field.
- **Background:** The Ask branch gives the focus back to the Ask field after Send, so the member types on while the start waits. The main composer and the follow-up field use the same `SendButton` with no such rule. `@firna/ui` renders Send as a native button that turns off while the send waits.
- **Problem:** After a mouse press in a Chromium browser, or a key on a focused Send, the focus stays on a turned-off button or falls to the page.
- **Impact if no action:** A member who presses Send must click the field again before typing.
- **Root question:** Does every message field keep the focus after Send?
- **Options:**
  - **A.** `SendButton` takes the handle of its field. It keeps the focus in the field at a mouse or touch press and gives it back after a key. State the rule once under Messages in `docs/protocol/messages-and-attachments.md`. Cost: on a phone, the keyboard of the main composer then stays open after Send and covers part of the answer. Effort: Medium.
  - **B.** Change nothing, and keep the rule for the Ask field only. Effort: Small.
- **Left out:** Taking Send out of the Tab order, because a mouse press still moves the focus and keyboard users lose the button.
- **Wider fix:** A.
- **Previous examples:** The Ask fix of review finding 4 on the Ask branch.
- **Recommendation:** A. One rule on the shared button keeps every message field the same.
- **Action:** ask the user, because the change alters the main composer and the follow-up field on `main`, and it changes the phone keyboard after Send.
