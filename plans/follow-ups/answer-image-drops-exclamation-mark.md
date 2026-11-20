# Answer drops the mark of an unknown image

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from branch `calummoore/screenshots-prompts-imnj`, a new problem from the check of review finding 1. Updated on 2026-11-20 by the merge of `main` into branch `calummoore/output-summary-f7sm`, where the shared Markdown parser replaced the answer reader of `chat-tokens.ts` and `chat-parts.ts`.
- **Location:** `imageParts` in `src/chat/markdown/answer-parts.ts`, and the image rules of `docs/protocol/file-mentions-answers.md` and `docs/protocol/chat-links.md`.
- **Reason:** The code is on `main` since commit `8781e0f14`, and the screenshots change did not touch this fallback.

- **Terms:**
  - **Markdown image:** text such as `![Phone view](shots/after.png)` in an agent answer.
  - **Entry:** a file or a folder of the workspace file tree that the chat knows.
- **Background:** When the path of a Markdown image is an entry, the answer shows a link or, for a picture file, a picture. When this item was added, the protocol said that an image whose path names no entry stays the text that the agent wrote, in `docs/protocol/file-mentions-answers.md`. The Markdown parser change replaced that sentence: such an image now shows its alt text, as `docs/protocol/chat-links.md` says, by design call 12 of the plan `plans/markdown-it-reader.md`, which draws an image as the file preview does (Markdown parser decision 8 D). This also holds while the tree loads. The screenshots change asks agents to show each screenshot as a Markdown image, so such images are now common.
- **Problem:** The old reader took the `!` into the link source and showed the text without it, so `![Phone view](shots/gone.png)` showed as `[Phone view](shots/gone.png)`. Since the merge with the shared parser, it shows its alt text, `Phone view`, by the rule above. A sent message still shows the image as typed, with its `!`.
- **Impact if no action:** An answer shows text that differs from what the agent wrote, while the tree loads or when the file is gone.
- **Root question:** How does an answer show the Markdown of an image whose path names no entry?
- **Options:**
  - **A.** Show the image as the agent wrote it, with its `!`, in `imageParts` of `src/chat/markdown/answer-parts.ts`, and add a case to `src/chat/markdown/answer-files.test.ts`. It changes the image rule of the protocol docs and design call 12, which needs the user's decision. Effort: Small.
- **Left out:** Showing such an image as a broken picture, because no file of the tree exists to read. The alt text of the current rule is the other approach.
- **Wider fix:** None. One protocol rule covers the case.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A. The fallback is code on `main` outside the screenshots change. The merge of 20 November 2026 kept the alt text of the parser change and left this choice to the user.
