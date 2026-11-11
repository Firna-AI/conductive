# A message sent while scrolled up stays out of view

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from branch `calummoore/chat-auto-scroll-issue`, a finding of the fix that keeps the chat at its newest message.
- **Location:** `src/chat/components/reading-place.ts`, and the `onSend` of the composer in `src/chat/components/SessionChat.tsx`.
- **Reason:** the recommended option adds behaviour that no requirement covers.

- **Terms:**
  - **Keeper:** `ReadingPlace` in `src/chat/components/reading-place.ts`. It keeps the row that the reader reads in place while the transcript changes size.
  - **Steer:** a message that a member sends while a turn runs. The running turn takes it.
- **Background:** The chat of a session scrolls in a box that keeps its bottom in place. At the bottom, the newest message stays in view while the agent writes. While the reader is scrolled up, the keeper keeps the row that they read in place. A message that the reader sends then shows at the end of the chat, below the view.
- **Problem:** After a send while scrolled up, the chat shows neither the sent message nor the work of the agent. The reader must scroll down to the end. This can look like the chat does not scroll with new content.
- **Impact if no action:** A reader who replies while they read older messages does not see their message or the answer until they scroll down.
- **Root question:** What does the chat show after the reader sends a message while they are scrolled up?
- **Options:**
  - **A.** Change nothing. The read row stays in place, and the reader scrolls down. Effort: Small.
  - **B.** Move the chat to its end when the reader sends a message or a steer. Then the chat follows the newest message. Effort: Small.
  - **C.** Do B, and show a button that moves the chat to its end while the reader is scrolled up. The button needs a mockup first. Effort: Medium.
- **Left out:** A move to the end when another member sends a message, because it takes the place of a reader who reads older messages.
- **Wider fix:** None, because this is a choice of behaviour, not a class of defect.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/chat-scroll-requirements.md`. The requirements that it adds to `docs/protocol/chat-and-events.md` include this answer.
- **Recommendation:** B. A reader who sends a message wants to see it and its answer, as in most chat apps.
- **Action:** ask the user, because the recommended option adds behaviour that no requirement covers.
