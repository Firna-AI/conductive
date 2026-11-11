# The read row moves when the chat box resizes

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/chat-auto-scroll-issue`, a problem outside the scope of its review round 1.
- **Location:** `src/chat/components/reading-place.ts`, the method `resized` of `ReadingPlace`.
- **Reason:** the review of the fix that keeps the chat at its newest message found it, and the behaviour is the same on `main`.

- **Terms:**
  - **Keeper:** `ReadingPlace` in `src/chat/components/reading-place.ts`. It keeps the row that the reader reads in place while the transcript changes size.
  - **Reversed box:** the box of the chat that scrolls. It uses `flex-direction: column-reverse` from `docs/mockups/src/components/chat/ChatPane.module.css`, so it keeps its bottom in place.
- **Background:**
  - The keeper observes the size of the transcript and the size of the box with one `ResizeObserver`.
  - When only the box changes height, `resized` notes the top row again and does not move the chat.
  - The box changes height when the composer grows or shrinks with its text, when a notice or the region of Mac requests shows under the chat, and when the window resizes.
  - The reversed box keeps its bottom in place, so each row moves by the change of height.
  - The reviewer measured it: a change of 50 px in the height of the box alone moved the read row by 50 px, on `main` and on that branch.
- **Problem:** While the reader is scrolled up, a change of the box height moves the row that they read. For example, a long message in the composer pushes the read text up.
- **Impact if no action:** The read text jumps when the composer or a notice under the chat changes height.
- **Root question:** Which row stays in place when the box of the chat changes height while the reader is scrolled up?
- **Options:**
  - **A.** Change nothing. The bottom of the chat stays in place, as at the end of the chat. Effort: Small.
  - **B.** Keep the top row in view in place, as for a change of the transcript: when only the box changed height, move the chat by the distance that the noted row moved. Effort: Small.
  - **C.** Keep the row at the middle of the box in place, so that the read text moves by half of the change in each direction. Effort: Small.
- **Left out:** None. These are the rows that can stay in place.
- **Wider fix:** None, because this is a choice of behaviour, not a class of defect.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/chat-scroll-requirements.md`. Its requirement "the row that the reader reads stays in place" also covers a change of the box height, so its answer can settle this item.
- **Recommendation:** B. The reader keeps the text that they read, as for every other change of size.
- **Action:** ask the user, because the recommended option adds behaviour that no requirement covers.
