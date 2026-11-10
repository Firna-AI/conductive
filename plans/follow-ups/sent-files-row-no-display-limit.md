# The sent files row has no display limit

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the turn end file limit on branch `calummoore/file-badges-display-limit`.
- **Location:** `src/chat/components/AttachmentChips.tsx:138`, the `SentFiles` part.
- **Reason:** The turn end file limit covers the files that a turn changed, not the files that a message carries, so this question needs its own change.

- **Terms:**
  - **Sent files row:** the chips under a sent message in the chat, one for each file that the message carries, with its name and size.
  - **Turn end:** the row at the end of a finished turn, with the duration and one chip for each file that the turn changed.
- **Background:** `SentFiles` in `src/chat/components/AttachmentChips.tsx` draws one chip for each attached file of a sent message. It has no display limit. The protocol limits each attached file to 25 MB, but it sets no limit on the number of files in one message, and the Worker checks no number. On 2026-11-10, the user chose a limit of five files for the turn end: the first five chips, then a button such as "9 more files" that shows the rest, and "Show fewer" that hides them.
- **Problem:** A message with many attached files shows one chip for each file, on many rows, under its bubble.
- **Impact if no action:** A message with many files pushes the answer down, as a large turn end did before its limit.
- **Root question:** How does a sent message with many files stay short in the chat?
- **Options:**
  - **A.** Change nothing. A person chooses each attached file, so a message seldom carries many. Effort: Small.
  - **B.** Give the sent files row the limit and the button of the turn end, with the shared helper of the turn end. It adds a protocol rule and a mockup. Effort: Small.
  - **C.** Limit the number of files in one message in the composer and the Worker. It adds a rejection, which the user must approve. Effort: Medium.
- **Left out:** A scroll area for the row. A scroll area in the transcript catches the wheel and the touch while the reader scrolls the chat.
- **Wider fix:** B. Each chip row of the chat then follows one display limit.
- **Previous examples:** The turn end had the same problem until its limit.
- **Recommendation:** B. It reuses the helper and the behaviour of the turn end, so the chat acts the same for both rows. A costs nothing until a message carries many files.
- **Action:** ask the user, because B adds a display rule that no requirement covers.
