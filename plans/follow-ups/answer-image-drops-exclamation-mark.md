# Answer drops the mark of an unknown image

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from branch `calummoore/screenshots-prompts-imnj`, a new problem from the check of review finding 1.
- **Location:** `src/chat/links/chat-tokens.ts:88` and `src/chat/links/chat-parts.ts:221`.
- **Reason:** The code is on `main` since commit `8781e0f14`, and the screenshots change did not touch this fallback.

- **Terms:**
  - **Markdown image:** text such as `![Phone view](shots/after.png)` in an agent answer.
  - **Entry:** a file or a folder of the workspace file tree that the chat knows.
- **Background:** When the path of a Markdown image is an entry, the answer shows a link or, for a picture file, a picture. When the path names no entry, the protocol says that the link stays the text that the agent wrote, in `docs/protocol/file-mentions-answers.md`. This also holds while the tree loads. The screenshots change asks agents to show each screenshot as a Markdown image, so such images are now common.
- **Problem:** The token reader at `chat-tokens.ts:88` takes the `!` into the link source, and the fallback at `chat-parts.ts:221` shows the text without it. So `![Phone view](shots/gone.png)` shows as `[Phone view](shots/gone.png)`.
- **Impact if no action:** An answer shows text that differs from what the agent wrote, while the tree loads or when the file is gone.
- **Root question:** How does an answer show the Markdown of an image whose path names no entry?
- **Options:**
  - **A.** Keep the `!` in the text of the fallback in `chat-parts.ts`, and add a case to `chat-parts-answers.test.ts`. Effort: Small.
- **Left out:** Showing such an image as a broken picture, because the protocol says that the text stays as written. Only one real approach remains.
- **Wider fix:** None. The protocol rule already covers the case.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A. The fallback is code on `main` outside the screenshots change.
