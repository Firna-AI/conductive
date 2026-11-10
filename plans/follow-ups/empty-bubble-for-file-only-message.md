# A message with only files shows an empty bubble

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the development page milestone of the branch `calummoore/chat-title-rename`, which names sessions from their first message.
- **Location:** `src/chat/components/TranscriptItem.tsx:26`, `UserBubble`.
- **Reason:** The code is already on `origin/main`, and the branch changes no part of the chat transcript.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **User bubble:** the grey box in the chat that shows the text of a message that a person sent, with its attached files below it.
- **Background:** The composer can send a message with files and no text, such as one screenshot. `UserBubble` always draws the text box, and draws the files under it. A smoke test of the development page on 8 November 2026 showed such a message: an empty grey box above one screenshot.
- **Problem:** A message with no text shows an empty grey box above its files.
- **Impact if no action:** The chat shows a small empty box for each message with only files. No mockup shows such a message.
- **Root question:** How does the chat show a message that has files and no text?
- **Options:**
  - **A.** Draw the text box only when the message has text. The files then show alone. Effort: Small.
  - **B.** Add a mockup state for a message with only files, and build the chat to match it. Effort: Medium.
  - **C.** Keep the empty box, and record it as the intended look. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. One component draws each message.
- **Previous examples:** None found.
- **Recommendation:** A. It removes a box that holds nothing, and it needs no new design.
- **Action:** ask the user, because no mockup shows this message, so the choice decides what the chat looks like.
